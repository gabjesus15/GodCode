-- Nadie se cambia el rol desde el navegador.
--
-- Hasta hoy, cualquier usuario con sesión en un negocio (un cajero, por ejemplo) podía,
-- con su propio token y PostgREST:
--   - ponerse role = 'admin' o 'ceo', salir de su sucursal, cambiarse el correo o las
--     pestañas (users_update_self no tiene with check y authenticated tiene UPDATE en
--     todas las columnas);
--   - pasarse a otro negocio (company_id) y quedar como CEO de ese negocio: el with check
--     implícito de users_update_self solo mira auth_user_id;
--   - cambiarle el rol, el correo o la sucursal a cualquiera de su negocio, o desactivar
--     al CEO (users_update_tenant);
--   - crear usuarios en su negocio con cualquier rol y sin el tope del plan
--     (users_insert_tenant).
--
-- Nada del código escribe en public.users con la sesión del usuario: el panel y las edge
-- functions solo leen, y las altas y cambios van por service role (/api/auth/super-admin-user,
-- /api/customer-account/team, onboarding). Por eso esto:
--   - quita INSERT y UPDATE de public.users a anon y authenticated; authenticated queda
--     con UPDATE solo de full_name y locale;
--   - borra users_insert_tenant y users_update_tenant: cada uno edita solo su propia fila
--     (users_update_self) y el super admin sigue con users_update_admin, ambos limitados
--     a esas dos columnas;
--   - agrega un trigger de respaldo para que, si algún día se vuelve a dar UPDATE o INSERT
--     a authenticated (un «grant all on all tables»), una sesión de usuario siga sin poder
--     crear filas ni cambiar nada que no sea full_name y locale.
--
-- service role, postgres y las funciones security definer no cambian. La lectura y el
-- borrado (users_delete_tenant) tampoco.
--
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

set local lock_timeout = '5s';

-- Las políticas tienen que ser las que se revisaron el 2026-10-17.
do $$
declare
	found text[];
begin
	select array_agg(polname::text order by polname) into found
	from pg_policy where polrelid = 'public.users'::regclass;

	if found is distinct from array[
		'users_delete_admin', 'users_delete_tenant',
		'users_insert_admin', 'users_insert_tenant',
		'users_select_admin', 'users_select_self', 'users_select_tenant',
		'users_update_admin', 'users_update_self', 'users_update_tenant'
	] then
		raise exception 'Políticas de public.users distintas a las revisadas: %', found;
	end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Permisos: desde el navegador solo el nombre y el idioma.
-- ---------------------------------------------------------------------------
revoke insert, update on public.users from anon, authenticated;
grant update (full_name, locale) on public.users to authenticated;

-- ---------------------------------------------------------------------------
-- Políticas: cada uno su propia fila; el super admin, cualquiera.
-- ---------------------------------------------------------------------------
drop policy users_insert_tenant on public.users;
drop policy users_update_tenant on public.users;

-- ---------------------------------------------------------------------------
-- Respaldo por si vuelven los permisos: security invoker, así current_user es el rol
-- de la sesión (anon/authenticated por PostgREST) y no el dueño de la función.
-- ---------------------------------------------------------------------------
create or replace function public.users_session_write_guard()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
	if current_user not in ('anon', 'authenticated') then
		return new;
	end if;

	if tg_op = 'INSERT' then
		raise exception 'users_insert_not_allowed' using errcode = '42501';
	end if;

	if (to_jsonb(new) - array['full_name', 'locale', 'updated_at'])
		is distinct from (to_jsonb(old) - array['full_name', 'locale', 'updated_at']) then
		raise exception 'users_column_not_allowed' using errcode = '42501';
	end if;

	return new;
end;
$$;

revoke all on function public.users_session_write_guard() from public, anon, authenticated;

create trigger users_session_write_guard
	before insert or update on public.users
	for each row execute function public.users_session_write_guard();

-- ---------------------------------------------------------------------------
-- Comprobaciones.
-- ---------------------------------------------------------------------------
do $$
declare
	found text[];
	extra text;
begin
	select string_agg(format('%s %s(%s)', r.name, p.name, a.attname), ', ') into extra
	from (values ('anon'), ('authenticated')) r(name)
	cross join (values ('INSERT'), ('UPDATE')) p(name)
	join pg_attribute a on a.attrelid = 'public.users'::regclass and a.attnum > 0 and not a.attisdropped
	where has_column_privilege(r.name, 'public.users', a.attname, p.name)
		and not (r.name = 'authenticated' and p.name = 'UPDATE' and a.attname in ('full_name', 'locale'));

	if extra is not null then
		raise exception 'Quedaron permisos de más: %', extra;
	end if;

	if not has_column_privilege('authenticated', 'public.users', 'full_name', 'UPDATE')
		or not has_column_privilege('authenticated', 'public.users', 'locale', 'UPDATE') then
		raise exception 'authenticated tiene que poder cambiar full_name y locale';
	end if;

	if not has_table_privilege('service_role', 'public.users', 'INSERT')
		or not has_table_privilege('service_role', 'public.users', 'UPDATE')
		or not has_table_privilege('service_role', 'public.users', 'DELETE') then
		raise exception 'service_role perdió permisos sobre public.users';
	end if;

	select array_agg(polname::text order by polname) into found
	from pg_policy where polrelid = 'public.users'::regclass;

	if found is distinct from array[
		'users_delete_admin', 'users_delete_tenant',
		'users_insert_admin',
		'users_select_admin', 'users_select_self', 'users_select_tenant',
		'users_update_admin', 'users_update_self'
	] then
		raise exception 'Las políticas no quedaron como se esperaba: %', found;
	end if;

	if not exists (
		select 1 from pg_trigger
		where tgrelid = 'public.users'::regclass and tgname = 'users_session_write_guard' and tgenabled = 'O'
	) then
		raise exception 'Falta el trigger users_session_write_guard';
	end if;
end
$$;

notify pgrst, 'reload schema';

commit;
