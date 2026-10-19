-- 2026-10-18 · Seguridad, paso 2: comprobar quién llama en las 4 funciones del panel.
--
-- Estas funciones son SECURITY DEFINER (saltan RLS) y no revisaban quién llama:
-- cualquier usuario con sesión, incluso un cliente con cuenta en el menú, podía
-- borrar productos, reordenar categorías o rehacer el inventario de un pedido de
-- cualquier negocio. Ahora aplican la misma regla que RLS en esas tablas:
--
--   admin_delete_product_with_branch  admin/ceo del negocio del producto
--                                     (como products_delete_tenant: is_admin()).
--   admin_reorder_categories          usuario del negocio de la sucursal
--   admin_set_category_order          (como category_branch_update_tenant).
--   admin_resync_order_inventory      usuario del negocio del pedido (como
--                                     inventory_*_tenant). La llama también
--                                     update_manual_order_v2 con la sesión del cajero.
--
-- El cajero tiene por defecto las pestañas Pedidos y Productos, por eso las tres
-- últimas no exigen admin. El super admin y el servidor (service role o sesión
-- directa a la base, sin usuario) pasan siempre.
--
-- create or replace conserva los permisos de 2026-10-18_revoke_open_functions.sql.

begin;

create or replace function public.assert_panel_company_access(
	p_company_id uuid,
	p_require_admin boolean default false
)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
	v_role text := coalesce(
		nullif(current_setting('request.jwt.claim.role', true), ''),
		nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
		''
	);
	v_company uuid;
	v_user_role text;
begin
	-- Servidor (service role) o sesión directa a la base, sin usuario.
	if v_role = 'service_role' or (v_role = '' and auth.uid() is null) then
		return;
	end if;
	if public.is_super_admin() then
		return;
	end if;

	select u.company_id, u.role into v_company, v_user_role
	from public.users u
	where u.auth_user_id = auth.uid() and coalesce(u.is_active, true)
	limit 1;

	if auth.uid() is null or p_company_id is null or v_company is distinct from p_company_id then
		raise exception 'No tienes acceso a este negocio.' using errcode = '42501';
	end if;
	if p_require_admin and coalesce(v_user_role, '') not in ('admin', 'ceo') then
		raise exception 'Solo un administrador o el CEO del negocio puede hacer esto.' using errcode = '42501';
	end if;
end;
$$;

revoke all on function public.assert_panel_company_access(uuid, boolean) from public, anon, authenticated;
grant execute on function public.assert_panel_company_access(uuid, boolean) to service_role;

create or replace function public.admin_delete_product_with_branch(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_company uuid;
begin
	select company_id into v_company from public.products where id = p_product_id;
	if not found then
		return;
	end if;
	perform public.assert_panel_company_access(v_company, true);

	delete from public.product_prices where product_id = p_product_id;
	delete from public.product_branch where product_id = p_product_id;
	delete from public.products where id = p_product_id;
end;
$$;

create or replace function public.admin_reorder_categories(p_branch_id uuid, p_category_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	i int;
	v_company uuid;
begin
	select company_id into v_company from public.branches where id = p_branch_id;
	if not found then
		return;
	end if;
	perform public.assert_panel_company_access(v_company);

	for i in 1 .. array_length(p_category_ids, 1)
	loop
		update public.category_branch
		set "order" = i
		where category_id = p_category_ids[i]
		and branch_id = p_branch_id;
	end loop;
end;
$$;

create or replace function public.admin_set_category_order(
	p_branch_id uuid,
	p_category_id uuid,
	p_new_order integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_company uuid;
begin
	select company_id into v_company from public.branches where id = p_branch_id;
	if not found then
		return;
	end if;
	perform public.assert_panel_company_access(v_company);

	update public.category_branch
	set "order" = p_new_order
	where category_id = p_category_id
	and branch_id = p_branch_id;
end;
$$;

create or replace function public.admin_resync_order_inventory(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
	v_order record;
	v_item jsonb;
	v_recipe record;
begin
	select * into v_order from public.orders where id = p_order_id;
	if not found then
		raise exception 'Orden no encontrada';
	end if;
	perform public.assert_panel_company_access(v_order.company_id);

	for v_item in select * from jsonb_array_elements(v_order.items)
	loop
		for v_recipe in
			select pir.*
			from public.product_inventory_recipe pir
			where pir.product_id = (v_item->>'id')::uuid
		loop
			insert into public.inventory_movements (
				branch_id, company_id, inventory_item_id,
				movement_type, quantity_delta, order_id, note
			) values (
				v_order.branch_id, v_order.company_id, v_recipe.inventory_item_id,
				'out', -(v_recipe.qty_per_sale * greatest(1, coalesce((v_item->>'quantity')::int, 1))),
				p_order_id, 'Resync orden #' || p_order_id
			);

			update public.inventory_branch
			set current_stock = greatest(0, current_stock - (v_recipe.qty_per_sale * greatest(1, coalesce((v_item->>'quantity')::int, 1)))),
				updated_at = now()
			where branch_id = v_order.branch_id
			and inventory_item_id = v_recipe.inventory_item_id;
		end loop;
	end loop;
end;
$$;

-- Comprobaciones.
do $$
declare
	r record;
	v_bad text := '';
begin
	for r in
		select p.oid, p.proname, p.prosrc, p.prosecdef
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname in (
			'admin_delete_product_with_branch', 'admin_reorder_categories',
			'admin_set_category_order', 'admin_resync_order_inventory')
	loop
		if position('assert_panel_company_access' in r.prosrc) = 0 or not r.prosecdef then
			v_bad := v_bad || format(' %s(guard)', r.proname);
		end if;
		if has_function_privilege('anon', r.oid, 'execute')
			or not has_function_privilege('authenticated', r.oid, 'execute')
			or not has_function_privilege('service_role', r.oid, 'execute') then
			v_bad := v_bad || format(' %s(grants)', r.proname);
		end if;
	end loop;

	if has_function_privilege('anon', 'public.assert_panel_company_access(uuid, boolean)', 'execute')
		or has_function_privilege('authenticated', 'public.assert_panel_company_access(uuid, boolean)', 'execute') then
		v_bad := v_bad || ' assert_panel_company_access(grants)';
	end if;

	if v_bad <> '' then
		raise exception 'comprobación fallida:%', v_bad;
	end if;
end
$$;

commit;

notify pgrst, 'reload schema';

-- Para deshacer: volver a las definiciones de antes (sin el perform
-- public.assert_panel_company_access) desde el respaldo
-- /root/backups/pre_panel_function_guards_20261018_032154.dump, por ejemplo con
-- pg_restore -f - --schema=public -P 'admin_reorder_categories(uuid, uuid[])' <dump>.
