-- Nadie se cambia el plan, el estado de la suscripción ni los accesos del negocio desde
-- el navegador.
--
-- Hasta hoy, cualquier usuario con sesión en un negocio (un cajero, por ejemplo) podía,
-- con su propio token y PostgREST, cambiar cualquier columna de su fila de companies
-- (companies_update_tenant no mira el rol y authenticated tiene UPDATE en todas las
-- columnas):
--   - plan_id, subscription_status y subscription_ends_at: plan más caro, «active» o
--     vencimiento en 2099 sin pagar;
--   - theme_config.panelAccess: las pestañas del panel que da el plan;
--   - integration_settings (allowTenantExternalDelivery, menu), public_slug,
--     custom_domain, first_payment_promo_used_at, created_by, datos legales;
--   - el resto de theme_config (storeDraft, ownerSetup, homePage, tema publicado).
--
-- Quién escribe companies con la sesión del usuario y no con service role:
--   - GodCode-Panel, saveCarouselSettings (pestaña Carrusel): reescribe theme_config
--     entero cambiando solo theme_config.menuCarousel (intervalMs, maxSlides).
--   - GodCode, company-form.tsx (super admin): inserta la empresa nueva.
-- Todo lo demás (/cuenta, cambios de plan, pagos, onboarding, super admin) va por
-- service role y no cambia.
--
-- Por eso esto:
--   - quita INSERT, UPDATE y DELETE a anon; a authenticated le quita UPDATE y DELETE y le
--     deja UPDATE solo de theme_config (INSERT queda: la política solo deja al super admin);
--   - pasa las políticas de escritura a «to authenticated» y les pone with check;
--   - agrega current_user_has_panel_tab(tabs): si el usuario de la sesión ve alguna de
--     esas pestañas del panel, con las mismas reglas que el panel (admin/ceo todas; rol
--     propio del negocio; role_definitions; y si no, lo del código para el cajero);
--   - agrega un trigger para que una sesión de usuario (que no sea super admin) solo pueda
--     cambiar theme_config.menuCarousel, solo si ve la pestaña Carrusel, y solo con
--     intervalMs/maxSlides numéricos; y no pueda crear empresas. También cubre el caso de
--     que algún día se vuelva a dar UPDATE o INSERT a authenticated o anon.
--
-- service role, postgres y las funciones security definer no cambian. La lectura tampoco
-- (ni la de anon por public_menu_read_active_companies, que va aparte).
--
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

set local lock_timeout = '5s';

-- Las políticas tienen que ser las que se revisaron el 2026-10-17.
do $$
declare
	found text[];
begin
	select array_agg(format('%s:%s:%s:%s', polname, polcmd,
		coalesce(pg_get_expr(polqual, polrelid), '-'), coalesce(pg_get_expr(polwithcheck, polrelid), '-')) order by polname)
	into found
	from pg_policy where polrelid = 'public.companies'::regclass;

	if found is distinct from array[
		'companies_insert_admin:a:-:is_super_admin()',
		'companies_select_admin:r:is_super_admin():-',
		'companies_select_tenant:r:(id = current_user_company_id()):-',
		'companies_update_admin:w:is_super_admin():-',
		'companies_update_tenant:w:(id = current_user_company_id()):-',
		'public_menu_read_active_companies:r:((subscription_status = ANY (ARRAY[''active''::text, ''trial''::text])) AND ((subscription_ends_at IS NULL) OR (subscription_ends_at > now()))):-'
	] then
		raise exception 'Políticas de public.companies distintas a las revisadas: %', found;
	end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Permisos: desde el navegador solo theme_config (y el alta, que es del super admin).
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.companies from anon;
revoke update, delete on public.companies from authenticated;
grant update (theme_config) on public.companies to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas: solo authenticated, y la fila nueva tiene que seguir cumpliendo.
-- ---------------------------------------------------------------------------
alter policy companies_insert_admin on public.companies to authenticated
	with check (public.is_super_admin());

alter policy companies_update_admin on public.companies to authenticated
	using (public.is_super_admin())
	with check (public.is_super_admin());

alter policy companies_update_tenant on public.companies to authenticated
	using (id = public.current_user_company_id())
	with check (id = public.current_user_company_id());

-- ---------------------------------------------------------------------------
-- ¿El usuario de la sesión ve alguna de estas pestañas del panel? Mismas reglas que
-- useRolePermissions del panel. Los alias de pestañas se pasan en p_tabs.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_has_panel_tab(p_tabs text[])
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $$
	select public.is_super_admin() or exists (
		select 1
		from public.users u
		cross join lateral (
			select case lower(btrim(coalesce(u.role, ''))) when 'staff' then 'cashier' else lower(btrim(coalesce(u.role, ''))) end as name
		) r
		left join public.company_roles cr on cr.id = u.company_role_id and r.name = 'cashier'
		left join public.role_definitions rd on rd.name = r.name
		where u.auth_user_id = auth.uid()
			and coalesce(u.is_active, true)
			and case
				when r.name in ('admin', 'ceo') then true
				when cr.id is not null then coalesce(cr.nav_tabs, '{}') && p_tabs
				when rd.nav_tabs is not null then rd.nav_tabs && p_tabs
				when r.name = 'cashier' then array['orders', 'caja', 'local_expenses'] && p_tabs
				else false
			end
	);
$$;

revoke all on function public.current_user_has_panel_tab(text[]) from public, anon;
grant execute on function public.current_user_has_panel_tab(text[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Trigger: security invoker, así current_user es el rol de la sesión (anon/authenticated
-- por PostgREST) y no el dueño de la función. Corre antes que set_updated_at (orden
-- alfabético), por eso se ignora updated_at.
-- ---------------------------------------------------------------------------
create or replace function public.companies_session_write_guard()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
	carousel jsonb;
begin
	if current_user not in ('anon', 'authenticated') or public.is_super_admin() then
		return new;
	end if;

	if tg_op = 'INSERT' then
		raise exception 'companies_insert_not_allowed' using errcode = '42501';
	end if;

	if (to_jsonb(new) - array['theme_config', 'updated_at'])
		is distinct from (to_jsonb(old) - array['theme_config', 'updated_at']) then
		raise exception 'companies_column_not_allowed' using errcode = '42501';
	end if;

	if (new.theme_config - 'menuCarousel') is distinct from (old.theme_config - 'menuCarousel') then
		raise exception 'companies_theme_key_not_allowed' using errcode = '42501';
	end if;

	carousel := new.theme_config -> 'menuCarousel';
	if carousel is distinct from old.theme_config -> 'menuCarousel' then
		if not public.current_user_has_panel_tab(array['menu_carousel', 'carousel']) then
			raise exception 'companies_menu_carousel_not_allowed' using errcode = '42501';
		end if;
		if jsonb_typeof(carousel) is distinct from 'object' or exists (
			select 1 from jsonb_each(carousel) e
			where e.key not in ('intervalMs', 'maxSlides') or jsonb_typeof(e.value) <> 'number'
		) then
			raise exception 'companies_menu_carousel_invalid' using errcode = '22023';
		end if;
	end if;

	return new;
end;
$$;

revoke all on function public.companies_session_write_guard() from public, anon, authenticated;

create trigger companies_session_write_guard
	before insert or update on public.companies
	for each row execute function public.companies_session_write_guard();

-- ---------------------------------------------------------------------------
-- Comprobaciones.
-- ---------------------------------------------------------------------------
do $$
declare
	found text[];
	extra text;
begin
	select string_agg(format('%s UPDATE(%s)', r.name, a.attname), ', ') into extra
	from (values ('anon'), ('authenticated')) r(name)
	join pg_attribute a on a.attrelid = 'public.companies'::regclass and a.attnum > 0 and not a.attisdropped
	where has_column_privilege(r.name, 'public.companies', a.attname, 'UPDATE')
		and not (r.name = 'authenticated' and a.attname = 'theme_config');

	if extra is not null then
		raise exception 'Quedaron permisos de más: %', extra;
	end if;

	if has_table_privilege('anon', 'public.companies', 'INSERT')
		or has_table_privilege('anon', 'public.companies', 'DELETE')
		or has_table_privilege('authenticated', 'public.companies', 'DELETE') then
		raise exception 'Quedó INSERT para anon o DELETE para anon/authenticated en public.companies';
	end if;

	if not has_column_privilege('authenticated', 'public.companies', 'theme_config', 'UPDATE')
		or not has_table_privilege('authenticated', 'public.companies', 'INSERT')
		or not has_table_privilege('authenticated', 'public.companies', 'SELECT')
		or not has_table_privilege('anon', 'public.companies', 'SELECT') then
		raise exception 'Se perdió un permiso que el panel, el menú o el alta del super admin necesitan';
	end if;

	if not has_table_privilege('service_role', 'public.companies', 'INSERT')
		or not has_table_privilege('service_role', 'public.companies', 'UPDATE')
		or not has_table_privilege('service_role', 'public.companies', 'DELETE') then
		raise exception 'service_role perdió permisos sobre public.companies';
	end if;

	select array_agg(format('%s:%s:%s:%s', polname, polcmd,
		coalesce(array_to_string(array(select rolname from pg_roles where oid = any(polroles) order by 1), ','), '-'),
		coalesce(pg_get_expr(polwithcheck, polrelid), '-')) order by polname)
	into found
	from pg_policy where polrelid = 'public.companies'::regclass;

	if found is distinct from array[
		'companies_insert_admin:a:authenticated:is_super_admin()',
		'companies_select_admin:r::-',
		'companies_select_tenant:r::-',
		'companies_update_admin:w:authenticated:is_super_admin()',
		'companies_update_tenant:w:authenticated:(id = current_user_company_id())',
		'public_menu_read_active_companies:r:anon:-'
	] then
		raise exception 'Las políticas no quedaron como se esperaba: %', found;
	end if;

	if not exists (
		select 1 from pg_trigger
		where tgrelid = 'public.companies'::regclass and tgname = 'companies_session_write_guard' and tgenabled = 'O'
	) then
		raise exception 'Falta el trigger companies_session_write_guard';
	end if;

	if has_function_privilege('anon', 'public.current_user_has_panel_tab(text[])', 'EXECUTE')
		or not has_function_privilege('authenticated', 'public.current_user_has_panel_tab(text[])', 'EXECUTE') then
		raise exception 'Permisos de current_user_has_panel_tab mal puestos';
	end if;
end
$$;

notify pgrst, 'reload schema';

commit;
