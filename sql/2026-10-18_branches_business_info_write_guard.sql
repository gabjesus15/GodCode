-- Los datos bancarios y de pago de un negocio no se cambian desde el navegador.
--
-- Hasta hoy, cualquier usuario con sesión en un negocio (un cajero, por ejemplo) podía,
-- con su propio token y PostgREST:
--   - en branches: cambiar bank_name, account_type, account_number, account_rut,
--     account_email, account_holder y los datos de cada medio de pago (efectivo, tarjeta,
--     pago_movil, zelle, transferencia_bancaria, paypal, stripe, mercadopago,
--     binance_pay, payment_methods), que el menú muestra para transferir; y crear
--     sucursales sin pasar por el tope del plan (branches_insert_tenant);
--   - en business_info: lo mismo, más bank_details.
-- branches_update_tenant y business_info_update no miran el rol, y authenticated tenía
-- UPDATE en todas las columnas.
--
-- Quién escribe estas tablas con la sesión del usuario y no con service role:
--   - GodCode-Panel cambia solo estas columnas de branches:
--       delivery_settings, origin_lat, origin_lng (branchSettingsService.saveDeliverySettings:
--         envío, zonas y ofertas del carrito; el cajero lo usa desde Inventario);
--       manual_order_settings (saveTicketSettings: diseño del ticket);
--       order_intake_paused, order_intake_pause_message, order_intake_paused_at,
--         order_intake_paused_by (orderIntakeService.setOrderIntakePaused).
--   - GodCode, branch-row.tsx (super admin): borra sucursales.
-- Todo lo demás (/cuenta, super admin, alta, la función geocode) va por service role y
-- no cambia. Las funciones security definer tampoco.
--
-- Por eso esto:
--   - branches: quita INSERT, UPDATE y DELETE a anon; a authenticated le quita INSERT y
--     UPDATE y le deja UPDATE solo de esas 8 columnas (DELETE queda: la política solo deja
--     al admin/ceo del negocio y al super admin); borra branches_insert_tenant;
--   - business_info: quita INSERT, UPDATE y DELETE a anon y authenticated; borra
--     business_info_insert y business_info_update;
--   - agrega triggers para que una sesión de usuario (que no sea super admin) no pueda
--     crear filas, en branches solo cambie esas 8 columnas y en business_info no escriba
--     nada. También cubre el caso de que algún día se vuelvan a dar esos permisos.
--
-- La lectura no cambia (ni la de anon para el menú público).
--
-- Correr como supabase_admin, en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

set local lock_timeout = '5s';

-- Las políticas tienen que ser las que se revisaron el 2026-10-18.
do $$
declare
	found text[];
begin
	select array_agg(format('%s:%s:%s', c.relname, p.polname, p.polcmd) order by c.relname, p.polname)
	into found
	from pg_policy p join pg_class c on c.oid = p.polrelid
	where p.polrelid in ('public.branches'::regclass, 'public.business_info'::regclass);

	if found is distinct from array[
		'branches:branches_delete_admin:d',
		'branches:branches_delete_tenant:d',
		'branches:branches_insert_admin:a',
		'branches:branches_insert_tenant:a',
		'branches:branches_select_admin:r',
		'branches:branches_select_tenant:r',
		'branches:branches_update_admin:w',
		'branches:branches_update_tenant:w',
		'branches:public_menu_read_active_branches:r',
		'business_info:business_info_insert:a',
		'business_info:business_info_select:r',
		'business_info:business_info_update:w',
		'business_info:public_menu_read_business_info:r'
	] then
		raise exception 'Políticas de branches/business_info distintas a las revisadas: %', found;
	end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Permisos.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.branches from anon;
revoke insert, update on public.branches from authenticated;
grant update (
	delivery_settings,
	origin_lat,
	origin_lng,
	manual_order_settings,
	order_intake_paused,
	order_intake_pause_message,
	order_intake_paused_at,
	order_intake_paused_by
) on public.branches to authenticated;

revoke insert, update, delete on public.business_info from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Políticas.
-- ---------------------------------------------------------------------------
drop policy branches_insert_tenant on public.branches;
drop policy business_info_insert on public.business_info;
drop policy business_info_update on public.business_info;

-- ---------------------------------------------------------------------------
-- Triggers: security invoker, así current_user es el rol de la sesión (anon/authenticated
-- por PostgREST) y no el dueño de la función. En branches corre antes que set_updated_at
-- (orden alfabético), por eso se ignora updated_at.
-- ---------------------------------------------------------------------------
create or replace function public.branches_session_write_guard()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
declare
	allowed text[] := array[
		'delivery_settings',
		'origin_lat',
		'origin_lng',
		'manual_order_settings',
		'order_intake_paused',
		'order_intake_pause_message',
		'order_intake_paused_at',
		'order_intake_paused_by',
		'updated_at'
	];
begin
	if current_user not in ('anon', 'authenticated') or public.is_super_admin() then
		return new;
	end if;

	if tg_op = 'INSERT' then
		raise exception 'branches_insert_not_allowed' using errcode = '42501';
	end if;

	if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
		raise exception 'branches_column_not_allowed' using errcode = '42501';
	end if;

	return new;
end;
$$;

revoke all on function public.branches_session_write_guard() from public, anon, authenticated;

create trigger branches_session_write_guard
	before insert or update on public.branches
	for each row execute function public.branches_session_write_guard();

create or replace function public.business_info_session_write_guard()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
	if current_user not in ('anon', 'authenticated') or public.is_super_admin() then
		return coalesce(new, old);
	end if;

	raise exception 'business_info_write_not_allowed' using errcode = '42501';
end;
$$;

revoke all on function public.business_info_session_write_guard() from public, anon, authenticated;

create trigger business_info_session_write_guard
	before insert or update or delete on public.business_info
	for each row execute function public.business_info_session_write_guard();

-- ---------------------------------------------------------------------------
-- Comprobaciones.
-- ---------------------------------------------------------------------------
do $$
declare
	found text[];
	extra text;
	panel_columns text[] := array[
		'delivery_settings', 'origin_lat', 'origin_lng', 'manual_order_settings',
		'order_intake_paused', 'order_intake_pause_message', 'order_intake_paused_at',
		'order_intake_paused_by'
	];
begin
	select string_agg(format('%s %s.%s', r.name, c.relname, a.attname), ', ') into extra
	from (values ('anon'), ('authenticated')) r(name)
	cross join (values ('public.branches'::regclass), ('public.business_info'::regclass)) t(rel)
	join pg_class c on c.oid = t.rel
	join pg_attribute a on a.attrelid = t.rel and a.attnum > 0 and not a.attisdropped
	where has_column_privilege(r.name, t.rel, a.attname, 'UPDATE')
		and not (r.name = 'authenticated' and t.rel = 'public.branches'::regclass and a.attname = any(panel_columns));

	if extra is not null then
		raise exception 'Quedaron permisos de UPDATE de más: %', extra;
	end if;

	select string_agg(c, ', ') into extra
	from unnest(panel_columns) c
	where not has_column_privilege('authenticated', 'public.branches', c, 'UPDATE');
	if extra is not null then
		raise exception 'El panel perdió UPDATE de: %', extra;
	end if;

	if has_table_privilege('anon', 'public.branches', 'INSERT')
		or has_table_privilege('anon', 'public.branches', 'DELETE')
		or has_table_privilege('authenticated', 'public.branches', 'INSERT')
		or has_table_privilege('anon', 'public.business_info', 'INSERT')
		or has_table_privilege('anon', 'public.business_info', 'DELETE')
		or has_table_privilege('authenticated', 'public.business_info', 'INSERT')
		or has_table_privilege('authenticated', 'public.business_info', 'DELETE') then
		raise exception 'Quedó INSERT o DELETE de más en branches/business_info';
	end if;

	if not has_table_privilege('authenticated', 'public.branches', 'DELETE')
		or not has_table_privilege('authenticated', 'public.branches', 'SELECT')
		or not has_table_privilege('anon', 'public.branches', 'SELECT')
		or not has_table_privilege('authenticated', 'public.business_info', 'SELECT')
		or not has_table_privilege('anon', 'public.business_info', 'SELECT') then
		raise exception 'Se perdió un permiso que el panel, el menú o el super admin necesitan';
	end if;

	if not has_table_privilege('service_role', 'public.branches', 'INSERT')
		or not has_table_privilege('service_role', 'public.branches', 'UPDATE')
		or not has_table_privilege('service_role', 'public.branches', 'DELETE')
		or not has_table_privilege('service_role', 'public.business_info', 'INSERT')
		or not has_table_privilege('service_role', 'public.business_info', 'UPDATE')
		or not has_table_privilege('service_role', 'public.business_info', 'DELETE') then
		raise exception 'service_role perdió permisos sobre branches/business_info';
	end if;

	select array_agg(format('%s:%s', c.relname, p.polname) order by c.relname, p.polname)
	into found
	from pg_policy p join pg_class c on c.oid = p.polrelid
	where p.polrelid in ('public.branches'::regclass, 'public.business_info'::regclass)
		and p.polname in ('branches_insert_tenant', 'business_info_insert', 'business_info_update');
	if found is not null then
		raise exception 'Quedaron políticas que se debían borrar: %', found;
	end if;

	if (select count(*) from pg_trigger
		where tgname in ('branches_session_write_guard', 'business_info_session_write_guard')
			and tgrelid in ('public.branches'::regclass, 'public.business_info'::regclass)
			and tgenabled = 'O') <> 2 then
		raise exception 'Faltan los triggers de branches/business_info';
	end if;
end
$$;

notify pgrst, 'reload schema';

commit;

-- Para deshacer (como supabase_admin): el respaldo
-- /root/backups/pre_branches_business_info_guard_20261018_035928.dump, o
--   drop trigger branches_session_write_guard on public.branches;
--   drop trigger business_info_session_write_guard on public.business_info;
--   grant insert, update, delete on public.branches, public.business_info to anon, authenticated;
--   create policy branches_insert_tenant on public.branches for insert
--     with check (company_id = public.current_user_company_id());
--   create policy business_info_insert on public.business_info for insert
--     with check (company_id = public.current_user_company_id());
--   create policy business_info_update on public.business_info for update
--     using (company_id = public.current_user_company_id());
