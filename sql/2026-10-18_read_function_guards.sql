-- 2026-10-18 · Seguridad, paso 3: funciones que leen datos de cualquier negocio.
--
-- El menú público trae el company_id del negocio (lo necesita para crear el
-- pedido), y con él cualquiera, sin sesión, podía leer:
--   admin_analytics_summary / _admin_analytics_period_summary  ventas por día,
--       hora, sucursal y medio de pago;
--   admin_analytics_top_products  productos más vendidos con unidades y plata;
--   get_company_health  pedidos e ingresos totales y último pedido;
--   compute_order_coupon_discount  probar códigos de cupón y ver cuánto descuentan.
--
-- Cambios:
--   admin_analytics_summary, admin_analytics_top_products, get_company_health:
--       sin public/anon y con assert_panel_company_access (mismo negocio; el
--       super admin y el servidor pasan). Panel › Analítica y super admin ›
--       Gestionar › Actividad las llaman con la sesión del usuario.
--   _admin_analytics_period_summary, compute_order_coupon_discount: cerradas del
--       todo (queda service_role). Solo las llaman funciones SECURITY DEFINER
--       (admin_analytics_summary, create_order_transaction, update_order_transaction).
--   assign_dorante_to_company: se borra (solo devolvía 'ok'; nadie la usa).
--
-- Correr como supabase_admin, igual que 2026-10-18_revoke_open_functions.sql.

begin;

create or replace function public.admin_analytics_summary(
	p_company_id uuid,
	p_branch_id uuid,
	p_start timestamp with time zone,
	p_end timestamp with time zone,
	p_prev_start timestamp with time zone,
	p_prev_end timestamp with time zone,
	p_channel text default null::text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
	v_current jsonb;
	v_previous jsonb;
begin
	perform public.assert_panel_company_access(p_company_id);

	v_current := public._admin_analytics_period_summary(
		p_company_id, p_branch_id, p_start, p_end, p_channel, true
	);
	v_previous := public._admin_analytics_period_summary(
		p_company_id, p_branch_id, p_prev_start, p_prev_end, p_channel, true
	);

	return jsonb_build_object(
		'current', v_current,
		'previous', v_previous,
		'orders_variation', case
			when coalesce((v_previous->>'order_count')::numeric, 0) > 0
			then round(
				(
					coalesce((v_current->>'order_count')::numeric, 0)
					- coalesce((v_previous->>'order_count')::numeric, 0)
				) / (v_previous->>'order_count')::numeric * 100,
				1
			)
			else null
		end,
		'sales_variation', case
			when coalesce((v_previous->>'total_sales')::numeric, 0) > 0
			then round(
				(
					coalesce((v_current->>'total_sales')::numeric, 0)
					- coalesce((v_previous->>'total_sales')::numeric, 0)
				) / (v_previous->>'total_sales')::numeric * 100,
				1
			)
			else null
		end
	);
end;
$$;

create or replace function public.admin_analytics_top_products(
	p_company_id uuid,
	p_branch_id uuid default null::uuid,
	p_start timestamp with time zone default null::timestamp with time zone,
	p_end timestamp with time zone default null::timestamp with time zone,
	p_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
	v_limit int;
	v_result jsonb;
begin
	if p_company_id is null then
		raise exception 'company_required' using errcode = '22000';
	end if;
	perform public.assert_panel_company_access(p_company_id);

	v_limit := greatest(1, least(coalesce(p_limit, 5), 50));

	select coalesce(
		jsonb_agg(
			jsonb_build_object(
				'name', agg.product_name,
				'qty', agg.qty,
				'revenue', agg.revenue
			)
			order by agg.qty desc, agg.product_name asc
		),
		'[]'::jsonb
	)
	into v_result
	from (
		select
			split_part(coalesce(nullif(btrim(item->>'name'), ''), 'Desconocido'), ' (', 1) as product_name,
			sum(greatest(coalesce((item->>'quantity')::numeric, 1), 1))::bigint as qty,
			sum(
				greatest(coalesce((item->>'quantity')::numeric, 1), 1)
				* case
						when coalesce((item->>'has_discount')::boolean, false)
							and coalesce((item->>'discount_price')::numeric, 0) > 0
						then (item->>'discount_price')::numeric
						else coalesce((item->>'price')::numeric, 0)
					end
				+ coalesce((item->>'extras_total')::numeric, 0)
			) as revenue
		from public.orders o
		cross join lateral jsonb_array_elements(
			case
				when o.items is null or jsonb_typeof(o.items) <> 'array' then '[]'::jsonb
				else o.items
			end
		) as item
		where o.company_id = p_company_id
			and o.status is distinct from 'cancelled'
			and (p_branch_id is null or o.branch_id = p_branch_id)
			and (p_start is null or o.created_at >= p_start)
			and (p_end is null or o.created_at < p_end)
			and coalesce(nullif(btrim(item->>'name'), ''), '') <> ''
		group by 1
		order by qty desc, product_name asc
		limit v_limit
	) as agg;

	return coalesce(v_result, '[]'::jsonb);
end;
$$;

create or replace function public.get_company_health(p_company_id uuid)
returns table(
	active_branches bigint,
	total_orders bigint,
	total_revenue numeric,
	last_order_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
	perform public.assert_panel_company_access(p_company_id);

	return query
	select
		(select count(*) from public.branches b where b.company_id = p_company_id and b.is_active = true),
		(select count(*) from public.orders o where o.company_id = p_company_id),
		(select coalesce(sum(o.total), 0) from public.orders o where o.company_id = p_company_id),
		(select max(o.created_at) from public.orders o where o.company_id = p_company_id);
end;
$$;

drop function public.assign_dorante_to_company();

do $$
declare
	v_guarded text[] := array['admin_analytics_summary', 'admin_analytics_top_products', 'get_company_health'];
	v_closed text[] := array['_admin_analytics_period_summary', 'compute_order_coupon_discount'];
	v_fn regprocedure;
	r record;
	v_bad text := '';
begin
	for v_fn in
		select p.oid::regprocedure
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = any(v_guarded)
	loop
		execute format('revoke execute on function %s from public, anon', v_fn);
		execute format('grant execute on function %s to authenticated, service_role', v_fn);
	end loop;

	for v_fn in
		select p.oid::regprocedure
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = any(v_closed)
	loop
		execute format('revoke execute on function %s from public, anon, authenticated', v_fn);
		execute format('grant execute on function %s to service_role', v_fn);
	end loop;

	-- Comprobaciones.
	if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = any(v_guarded || v_closed)) <> 5 then
		v_bad := v_bad || ' faltan funciones';
	end if;

	for r in
		select p.oid, p.proname, p.prosrc
		from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = any(v_guarded || v_closed)
	loop
		if has_function_privilege('anon', r.oid, 'execute') then
			v_bad := v_bad || format(' %s(anon)', r.proname);
		end if;
		if has_function_privilege('authenticated', r.oid, 'execute') <> (r.proname = any(v_guarded)) then
			v_bad := v_bad || format(' %s(authenticated)', r.proname);
		end if;
		if not has_function_privilege('service_role', r.oid, 'execute') then
			v_bad := v_bad || format(' %s(service_role)', r.proname);
		end if;
		if r.proname = any(v_guarded) and position('assert_panel_company_access' in r.prosrc) = 0 then
			v_bad := v_bad || format(' %s(guard)', r.proname);
		end if;
	end loop;

	if exists (
		select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
		where n.nspname = 'public' and p.proname = 'assign_dorante_to_company'
	) then
		v_bad := v_bad || ' assign_dorante_to_company(existe)';
	end if;

	if v_bad <> '' then
		raise exception 'comprobación fallida:%', v_bad;
	end if;
end
$$;

commit;

notify pgrst, 'reload schema';

-- Para deshacer: las definiciones anteriores están en el respaldo
-- /root/backups/pre_read_function_guards_20261018_034559.dump. Los permisos de antes eran
-- anon, authenticated y service_role en las 5 funciones.
