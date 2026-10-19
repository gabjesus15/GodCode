-- 2026-10-18 · Seguridad, paso 1: cerrar funciones SECURITY DEFINER abiertas a anon.
--
-- Los permisos por defecto del esquema public dan EXECUTE a anon y authenticated
-- en cada función nueva, y Postgres además se lo da a PUBLIC. Así volvieron a
-- quedar abiertas funciones que escriben datos sin revisar quién llama (borrar
-- pedidos o caja de cualquier negocio, cambiar saldos, crear roles...).
--
-- Correr como supabase_admin: postgres no es superusuario y no puede cambiar los
-- permisos por defecto de supabase_admin.
--
-- Grupos:
--   cerrar     sin public/anon/authenticated; queda service_role (el servidor).
--   triggers   igual que cerrar. Al dispararse, un trigger no revisa EXECUTE.
--   solo_anon  sin public/anon; quedan authenticated y service_role. Las usa el
--              panel con la sesión del usuario, o las llaman triggers que no son
--              SECURITY DEFINER (corren como el usuario del panel).
-- create_public_order_v1 no se toca: es el carrito del menú, sin sesión.
--
-- Desde ahora, un SQL que cree una función para el panel o el menú tiene que
-- darle el permiso explícito (grant execute ... to authenticated / anon).
-- create or replace conserva los permisos; drop + create los pierde.

begin;

-- Funciones nuevas: que no nazcan abiertas.
alter default privileges for role postgres in schema public
	revoke execute on functions from anon, authenticated;
alter default privileges for role supabase_admin in schema public
	revoke execute on functions from anon, authenticated;
-- Global para postgres: solo afecta lo que postgres cree desde ahora. storage y
-- supabase_functions tienen sus propios permisos por defecto. PUBLIC de
-- supabase_admin no se toca porque rompería extensiones nuevas.
alter default privileges for role postgres
	revoke execute on functions from public;

do $$
declare
	v_cerrar text[] := array[
		'admin_reset_company_operations',
		'admin_delete_monthly_data',
		'admin_delete_shift_history',
		'admin_purge_clients',
		'increment_expected_balance',
		'increment_shift_balance',
		'rebuild_users_role_check_from_definitions',
		'apply_inventory_for_order_internal',
		'upsert_client_delivery_address',
		'create_menu_order_atomic_v1',
		'create_role_definition',
		'update_role_definition',
		'delete_role_definition',
		'redeem_subscription_coupon',
		'attach_public_order_evidence_v1'
	];
	v_triggers text[] := array[
		'assign_company_order_number',
		'loyalty_ledger_sync_order',
		'sync_product_active_state'
	];
	v_solo_anon text[] := array[
		'admin_delete_product_with_branch',
		'admin_reorder_categories',
		'admin_set_category_order',
		'admin_resync_order_inventory',
		'ensure_order_lines_v3',
		'recalculate_cash_shift_totals_v1'
	];
	v_menu text[] := array['create_public_order_v1'];
	v_name text;
	v_count int;
	v_fn regprocedure;
	r record;
	v_bad text := '';
begin
	foreach v_name in array v_cerrar || v_triggers || v_solo_anon || v_menu loop
		select count(*) into v_count
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = v_name;
		if v_count <> 1 then
			raise exception 'se esperaba 1 función public.% y hay %', v_name, v_count;
		end if;
	end loop;

	for v_fn in
		select p.oid::regprocedure
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = any(v_cerrar || v_triggers)
	loop
		execute format('revoke execute on function %s from public, anon, authenticated', v_fn);
		execute format('grant execute on function %s to service_role', v_fn);
	end loop;

	for v_fn in
		select p.oid::regprocedure
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = any(v_solo_anon)
	loop
		execute format('revoke execute on function %s from public, anon', v_fn);
		execute format('grant execute on function %s to authenticated, service_role', v_fn);
	end loop;

	-- Comprobaciones.
	for r in
		select p.oid, p.proname
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public'
			and p.proname = any(v_cerrar || v_triggers || v_solo_anon || v_menu)
	loop
		if has_function_privilege('anon', r.oid, 'execute') <> (r.proname = any(v_menu)) then
			v_bad := v_bad || format(' %s(anon)', r.proname);
		end if;
		if has_function_privilege('authenticated', r.oid, 'execute')
			<> (r.proname = any(v_menu || v_solo_anon)) then
			v_bad := v_bad || format(' %s(authenticated)', r.proname);
		end if;
		if not has_function_privilege('service_role', r.oid, 'execute') then
			v_bad := v_bad || format(' %s(service_role)', r.proname);
		end if;
	end loop;

	if exists (
		select 1
		from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
		where n.nspname = 'public' and d.defaclobjtype = 'f'
			and pg_get_userbyid(d.defaclrole) in ('postgres', 'supabase_admin')
			and d.defaclacl::text ~ '[{,](anon|authenticated)='
	) then
		v_bad := v_bad || ' default_acl(public)';
	end if;

	if not exists (
		select 1 from pg_default_acl d
		where d.defaclnamespace = 0 and d.defaclobjtype = 'f'
			and pg_get_userbyid(d.defaclrole) = 'postgres'
			and d.defaclacl::text !~ '[{,]=X'
	) then
		v_bad := v_bad || ' default_acl(global postgres)';
	end if;

	if v_bad <> '' then
		raise exception 'permisos inesperados:%', v_bad;
	end if;
end
$$;

commit;

notify pgrst, 'reload schema';

-- Para deshacer (como supabase_admin):
--
-- begin;
-- alter default privileges for role postgres in schema public
-- 	grant execute on functions to anon, authenticated;
-- alter default privileges for role supabase_admin in schema public
-- 	grant execute on functions to anon, authenticated;
-- alter default privileges for role postgres
-- 	grant execute on functions to public;
-- do $$
-- declare v_fn regprocedure;
-- begin
-- 	for v_fn in
-- 		select p.oid::regprocedure
-- 		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
-- 		where n.nspname = 'public' and p.proname = any(array[
-- 			'admin_reset_company_operations', 'admin_delete_monthly_data',
-- 			'admin_delete_shift_history', 'admin_purge_clients',
-- 			'increment_expected_balance', 'increment_shift_balance',
-- 			'rebuild_users_role_check_from_definitions',
-- 			'apply_inventory_for_order_internal', 'upsert_client_delivery_address',
-- 			'create_menu_order_atomic_v1', 'create_role_definition',
-- 			'update_role_definition', 'delete_role_definition',
-- 			'redeem_subscription_coupon', 'attach_public_order_evidence_v1',
-- 			'assign_company_order_number', 'loyalty_ledger_sync_order',
-- 			'sync_product_active_state', 'admin_delete_product_with_branch',
-- 			'admin_reorder_categories', 'admin_set_category_order',
-- 			'admin_resync_order_inventory', 'ensure_order_lines_v3',
-- 			'recalculate_cash_shift_totals_v1'])
-- 	loop
-- 		execute format('grant execute on function %s to anon, authenticated, service_role', v_fn);
-- 	end loop;
-- end
-- $$;
-- commit;
-- notify pgrst, 'reload schema';
