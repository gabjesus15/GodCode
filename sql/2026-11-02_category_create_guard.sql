-- 2026-11-02 · Seguridad: admin_create_category_with_overrides revisa quién llama.
--
-- Es SECURITY DEFINER (salta RLS) y no revisaba nada. anon tenía EXECUTE, así que
-- cualquiera con la anon key (va en el navegador) podía llamarla sin sesión: la empresa
-- salía null (categories.company_id admite null) y quedaban categorías huérfanas, más
-- filas de category_branch apuntando a la sucursal que pasara, aunque fuera de otro
-- negocio. Con sesión, cualquier usuario la usaba: un cliente con cuenta en el menú, un
-- usuario desactivado o alguien de otra empresa (vinculando a una sucursal ajena).
--
-- Ahora aplica la misma regla que RLS en categories (categories_insert_tenant): usuario
-- activo del negocio, sin exigir admin, porque el cajero tiene la pestaña Productos por
-- defecto. Y la sucursal tiene que ser de ese negocio.
--
-- Quién la llama, siempre con la sesión del usuario:
--   - Panel (Caja): src/modules/cash/admin/hooks/useAdminCatalog.js (crear categoría).
--   - GodCode: lib/menu/create-menu-items.ts (cargar la carta desde /cuenta, sesión del dueño).
-- Ninguno la llama sin sesión, así que anon pierde EXECUTE.
--
-- Correr como postgres (dueño de la función), en una transacción. Antes: pg_dump -Fc a
-- /root/backups.

begin;

create or replace function public.admin_create_category_with_overrides(
	p_name text,
	p_branch_id uuid,
	p_order integer default 0,
	p_is_active boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_category_id uuid;
	v_company_id uuid;
begin
	select company_id into v_company_id
	from public.users
	where auth_user_id = auth.uid() and coalesce(is_active, true)
	limit 1;

	perform public.assert_panel_company_access(v_company_id);

	-- assert_panel_company_access deja pasar al service role y al super admin aunque no
	-- tengan negocio; sin negocio no hay dónde crear la categoría.
	if v_company_id is null then
		raise exception 'No tienes acceso a este negocio.' using errcode = '42501';
	end if;

	if not exists (
		select 1 from public.branches b
		where b.id = p_branch_id and b.company_id = v_company_id
	) then
		raise exception 'La sucursal no es de tu negocio.' using errcode = '42501';
	end if;

	insert into public.categories (company_id, name, "order", is_active)
	values (v_company_id, p_name, p_order, p_is_active)
	returning id into v_category_id;

	insert into public.category_branch (category_id, branch_id, company_id, is_active, "order")
	values (v_category_id, p_branch_id, v_company_id, p_is_active, p_order);

	return v_category_id;
end;
$$;

revoke all on function public.admin_create_category_with_overrides(text, uuid, integer, boolean)
	from public, anon;
grant execute on function public.admin_create_category_with_overrides(text, uuid, integer, boolean)
	to authenticated, service_role;

-- Comprobaciones.
do $$
declare
	v_fn regprocedure := 'public.admin_create_category_with_overrides(text, uuid, integer, boolean)';
	v_bad text := '';
begin
	if position('assert_panel_company_access' in (select prosrc from pg_proc where oid = v_fn)) = 0 then
		v_bad := v_bad || ' guard';
	end if;
	if has_function_privilege('anon', v_fn, 'execute') then
		v_bad := v_bad || ' anon';
	end if;
	if not has_function_privilege('authenticated', v_fn, 'execute')
		or not has_function_privilege('service_role', v_fn, 'execute') then
		v_bad := v_bad || ' grants';
	end if;
	if v_bad <> '' then
		raise exception 'comprobación fallida:%', v_bad;
	end if;
end
$$;

commit;

notify pgrst, 'reload schema';

-- Para deshacer: volver a la definición anterior desde el respaldo, por ejemplo con
-- pg_restore -f - --schema=public
--   -P 'admin_create_category_with_overrides(text, uuid, integer, boolean)' <dump>,
-- y `grant execute ... to anon` si hiciera falta.
