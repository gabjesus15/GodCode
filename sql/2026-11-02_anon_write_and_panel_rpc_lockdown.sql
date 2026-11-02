-- 2026-11-02 · Seguridad: anon (sin sesión) ya no escribe, no ejecuta funciones del panel
-- y no lee tablas internas.
--
-- Hasta hoy:
--   1. anon tenía INSERT/UPDATE/DELETE en ~80 tablas de public. RLS lo frenaba (ninguna
--      política de escritura deja pasar a anon: todas piden current_user_company_id(),
--      is_super_admin() o auth.uid()), pero bastaba una política mal escrita para abrirlo.
--      Los privilegios por defecto de postgres y supabase_admin daban arwd a anon en cada
--      tabla nueva.
--   2. anon tenía EXECUTE en 23 funciones SECURITY DEFINER del panel (caja, pedidos,
--      cobros, reembolsos, productos). Todas buscan al usuario por auth.uid() y cortan sin
--      sesión, pero anon no tiene por qué llegar a ellas.
--   3. saas_broadcasts, saas_admin_modules, plan_payment_methods,
--      plan_payment_method_config y role_definitions se leían sin sesión (using (true)
--      para public): avisos a los negocios, módulos del super admin, datos de Pago Móvil.
--
-- Quién hace qué sin sesión (revisado en GodCode y GodCode-Panel el 2026-11-02):
--   - La tienda solo escribe por create_public_order_v1 (DEFINER, sigue abierta) y por
--     rutas de servidor con service role. Ninguna escritura usa la anon key.
--   - Las funciones del punto 2 las llama el panel con la sesión del usuario
--     (authenticated) o el servidor (service role); create_order_transaction la llama
--     /api/menu-account/order con service role.
--   - Las tablas del punto 3 se leen con service role (rutas de super admin, /api/tenant/
--     broadcasts, la edge function tenant-broadcasts, checkout, /cuenta). role_definitions
--     la lee el panel con la sesión (useRolePermissions.js): queda abierta solo a
--     authenticated.
-- Lo que anon sigue necesitando no se toca: SELECT de la tienda (con sus políticas), las
-- funciones públicas (get_public_menu, create_public_order_v1, get_cart_branch_prices…)
-- y los helpers que usan las políticas (is_super_admin, current_user_company_id…).
--
-- Correr como supabase_admin (cambia privilegios por defecto de postgres y de
-- supabase_admin), en una transacción. Antes: pg_dump -Fc a /root/backups.

begin;

-- 1. Sin escrituras de anon en public, ni hoy ni en tablas nuevas.
revoke insert, update, delete on all tables in schema public from anon;
alter default privileges for role postgres in schema public revoke insert, update, delete on tables from anon;
alter default privileges for role supabase_admin in schema public revoke insert, update, delete on tables from anon;

-- 2. Funciones del panel: fuera anon y public; authenticated y service_role explícitos,
-- por si alguna solo tenía EXECUTE a través de public.
do $$
declare
	r record;
begin
	for r in
		select p.oid::regprocedure as fn
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = any (array[
			'admin_set_product_sizes', 'admin_set_product_variants', 'admin_upsert_product_with_branch',
			'attach_order_payment_evidence_v2', 'attach_order_receipt_v3',
			'cash_add_movement', 'cash_open_shift', 'count_pending_payment_evidence_v2',
			'create_manual_order_atomic_v1', 'create_manual_order_v2', 'create_order_transaction',
			'mark_order_payment_evidence_uploading_v2', 'menu_client_accounts_panel_list',
			'quote_manual_order_v2', 'record_manual_order_metric_v1', 'refund_order_payment_v2',
			'settle_and_transition_order_atomic_v1', 'settle_order_payment_v3', 'settle_order_v2',
			'transition_order_line_v3', 'transition_order_v2', 'update_manual_order_v2',
			'update_order_transaction', 'update_order_v3'
		])
	loop
		execute format('grant execute on function %s to authenticated, service_role', r.fn);
		execute format('revoke execute on function %s from public, anon', r.fn);
	end loop;
end
$$;

-- 3. Tablas internas: solo con sesión.
alter policy role_definitions_select on public.role_definitions to authenticated using (true);
alter policy saas_broadcasts_select on public.saas_broadcasts to authenticated using (public.is_super_admin());
alter policy saas_admin_modules_select on public.saas_admin_modules to authenticated using (public.is_super_admin());
alter policy plan_payment_methods_select on public.plan_payment_methods to authenticated using (public.is_super_admin());
alter policy ppmc_select on public.plan_payment_method_config to authenticated using (public.is_super_admin());

-- Comprobaciones.
do $$
declare
	v_bad text := '';
	v_n int;
begin
	select count(*) into v_n
	from information_schema.role_table_grants
	where grantee = 'anon' and table_schema = 'public' and privilege_type in ('INSERT', 'UPDATE', 'DELETE');
	if v_n > 0 then v_bad := v_bad || format(' escrituras_anon=%s', v_n); end if;

	select count(*) into v_n
	from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
	where n.nspname = 'public' and d.defaclobjtype = 'r' and d.defaclacl::text ~ 'anon=[^/]*[awd]';
	if v_n > 0 then v_bad := v_bad || ' default_acl_anon'; end if;

	select count(*) into v_n
	from pg_proc p join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public' and p.proname in (
		'cash_add_movement', 'refund_order_payment_v2', 'settle_order_v2', 'update_order_v3',
		'create_order_transaction', 'menu_client_accounts_panel_list')
	and (has_function_privilege('anon', p.oid, 'execute')
		or not has_function_privilege('authenticated', p.oid, 'execute'));
	if v_n > 0 then v_bad := v_bad || ' funciones'; end if;

	-- Lo que la tienda necesita sigue abierto.
	if not has_function_privilege('anon', 'public.is_super_admin()', 'execute')
		or not has_table_privilege('anon', 'public.products', 'select')
		or not exists (
			select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
			where n.nspname = 'public' and p.proname = 'create_public_order_v1'
			and has_function_privilege('anon', p.oid, 'execute')) then
		v_bad := v_bad || ' tienda';
	end if;

	select count(*) into v_n
	from pg_policies
	where schemaname = 'public' and cmd = 'SELECT' and qual = 'true'
	and tablename in ('saas_broadcasts', 'saas_admin_modules', 'plan_payment_methods', 'plan_payment_method_config');
	if v_n > 0 then v_bad := v_bad || ' politicas'; end if;

	if v_bad <> '' then
		raise exception 'comprobación fallida:%', v_bad;
	end if;
end
$$;

commit;

notify pgrst, 'reload schema';

-- Para deshacer:
--   grant insert, update, delete on all tables in schema public to anon;
--   alter default privileges for role postgres in schema public grant insert, update, delete on tables to anon;
--   (igual para supabase_admin)
--   grant execute on function <cada una> to anon;
--   alter policy <cada una> on <tabla> to public using (true);
