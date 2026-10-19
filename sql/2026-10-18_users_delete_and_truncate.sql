-- Nadie borra usuarios con su sesión, y anon/authenticated pierden TRUNCATE y compañía.
--
-- 1. users_delete_tenant ((company_id = current_user_company_id()) AND is_admin()):
--    is_admin() es verdadero para admin y ceo, así que un admin del negocio podía, con su
--    token y PostgREST (DELETE /rest/v1/users?role=eq.ceo), borrar la fila del CEO (que
--    se queda sin panel ni /cuenta) o la de cualquier otro usuario, saltándose Equipo de
--    /cuenta. Probado con rollback el 2026-10-18: borró las 2 filas de CEO de Oishi.
--    Quién borra usuarios de verdad: Equipo de /cuenta (lib/tenant/company-team.ts), el
--    super admin (app/api/auth/super-admin-user) y el cron de tiendas borrador, todos con
--    service role. El panel no borra usuarios.
--    → sin DELETE para anon y authenticated, y sin users_delete_tenant. users_delete_admin
--      (solo super admin) queda: si algún día vuelve el permiso, solo pasa el super admin.
--
-- 2. anon y authenticated tenían TRUNCATE, REFERENCES, TRIGGER y MAINTAIN en 86 de las 91
--    tablas de public, por los permisos por defecto. TRUNCATE vacía una tabla sin pasar
--    por RLS. Hoy no se puede usar (PostgREST y GraphQL no lo ejecutan, esos roles no
--    entran directo a la base y no hay funciones con SQL dinámico como el usuario), pero
--    no hace falta que lo tengan.
--    → se quitan en todas las tablas de public y en los permisos por defecto de postgres y
--      supabase_admin. SELECT, INSERT, UPDATE y DELETE quedan como están (los protege RLS
--      y los usan el panel y el menú). storage y supabase_functions no se tocan.
--
-- Correr como supabase_admin, en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

set local lock_timeout = '5s';

-- Las políticas de users tienen que ser las que se revisaron el 2026-10-18.
do $$
declare
	found text[];
begin
	select array_agg(format('%s:%s', polname, polcmd) order by polname) into found
	from pg_policy where polrelid = 'public.users'::regclass;

	if found is distinct from array[
		'users_delete_admin:d',
		'users_delete_tenant:d',
		'users_insert_admin:a',
		'users_select_admin:r',
		'users_select_self:r',
		'users_select_tenant:r',
		'users_update_admin:w',
		'users_update_self:w'
	] then
		raise exception 'Políticas de public.users distintas a las revisadas: %', found;
	end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Borrar usuarios.
-- ---------------------------------------------------------------------------
revoke delete on public.users from anon, authenticated;
drop policy users_delete_tenant on public.users;

-- ---------------------------------------------------------------------------
-- 2. TRUNCATE, REFERENCES, TRIGGER, MAINTAIN.
-- ---------------------------------------------------------------------------
revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;

alter default privileges for role postgres in schema public
	revoke truncate, references, trigger, maintain on tables from anon, authenticated;
alter default privileges for role supabase_admin in schema public
	revoke truncate, references, trigger, maintain on tables from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Comprobaciones.
-- ---------------------------------------------------------------------------
do $$
declare
	extra text;
begin
	if has_table_privilege('anon', 'public.users', 'DELETE')
		or has_table_privilege('authenticated', 'public.users', 'DELETE') then
		raise exception 'Quedó DELETE en public.users para anon o authenticated';
	end if;

	if exists (select 1 from pg_policy where polrelid = 'public.users'::regclass and polname = 'users_delete_tenant')
		or not exists (select 1 from pg_policy where polrelid = 'public.users'::regclass and polname = 'users_delete_admin') then
		raise exception 'Las políticas de borrado de public.users no quedaron como se esperaba';
	end if;

	select string_agg(format('%s %s %s', r.name, c.relname, p.priv), ', ') into extra
	from pg_class c
	cross join (values ('anon'), ('authenticated')) r(name)
	cross join (values ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')) p(priv)
	where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p', 'v', 'm', 'f')
		and has_table_privilege(r.name, c.oid, p.priv);

	if extra is not null then
		raise exception 'Quedaron permisos de más: %', extra;
	end if;

	if exists (
		select 1 from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
		where n.nspname = 'public' and d.defaclobjtype = 'r'
			and pg_get_userbyid(d.defaclrole) in ('postgres', 'supabase_admin')
			and d.defaclacl::text ~ '[{,](anon|authenticated)=[a-zA-Z]*[DxtmT]'
	) then
		raise exception 'Los permisos por defecto de tablas todavía dan TRUNCATE/REFERENCES/TRIGGER/MAINTAIN';
	end if;

	-- Lo que el panel y el menú necesitan sigue igual.
	if not has_table_privilege('anon', 'public.products', 'SELECT')
		or not has_table_privilege('anon', 'public.branches', 'SELECT')
		or not has_table_privilege('authenticated', 'public.orders', 'SELECT')
		or not has_table_privilege('authenticated', 'public.orders', 'INSERT')
		or not has_table_privilege('authenticated', 'public.orders', 'UPDATE')
		or not has_table_privilege('authenticated', 'public.orders', 'DELETE')
		or not has_table_privilege('authenticated', 'public.users', 'SELECT') then
		raise exception 'Se perdió un permiso que el panel o el menú necesitan';
	end if;

	if not has_table_privilege('service_role', 'public.users', 'DELETE')
		or not has_table_privilege('service_role', 'public.orders', 'TRUNCATE') then
		raise exception 'service_role perdió permisos';
	end if;
end
$$;

notify pgrst, 'reload schema';

commit;

-- Para deshacer (como supabase_admin): el respaldo
-- /root/backups/pre_users_delete_truncate_20261018_043705.dump, o
--   grant delete on public.users to anon, authenticated;
--   create policy users_delete_tenant on public.users for delete
--     using (company_id = public.current_user_company_id() and public.is_admin());
--   grant truncate, references, trigger, maintain on all tables in schema public to anon, authenticated;
--   alter default privileges for role postgres in schema public
--     grant truncate, references, trigger, maintain on tables to anon, authenticated;
--   alter default privileges for role supabase_admin in schema public
--     grant truncate, references, trigger, maintain on tables to anon, authenticated;
-- (ojo: el grant masivo de TRUNCATE también se lo daría a las 5 tablas que no lo tenían:
-- addon_requests, addon_data, onboarding_applications, company_roles,
-- onboarding_application_addons).
