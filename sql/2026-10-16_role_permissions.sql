-- Permisos por rol editables desde el super admin (Configuración → Roles), fase 1: cajero.
--
-- Hasta ahora lo que ve y hace cada rol estaba fijo en el código. Desde aquí:
--   - role_definitions.nav_tabs: pestañas del panel que ve el rol (null = lo del código).
--   - role_definitions.actions: acciones sensibles que el rol puede hacer.
-- owner, admin y ceo ven y hacen todo siempre; no se leen de la tabla.
--
-- Acciones (mismas claves en GodCode lib/super-admin/role-permissions.ts y en
-- GodCode-Panel src/modules/cash/utils/rolePermissions.js):
--   loyalty_rewards.manage        crear, editar y borrar recompensas por puntos
--   orders.refund                 reembolsar pagos de un pedido
--   orders.delivery_fee_override  cambiar a mano el costo de envío
--   coupons.send_email            enviar cupones por correo (Edge Function coupon-emails)
--
-- El cajero queda sembrado con lo de hoy (Pedidos, Caja, Gastos; ninguna acción): al
-- aplicar esto nadie gana ni pierde nada. refund_order_payment_v2,
-- resolve_delivery_fee_for_role y resolve_delivery_fee_for_role_legacy_v1 (la que
-- atiende el precio por distancia) son copia exacta de producción al 2026-10-16 salvo la
-- línea del rol. Las políticas de loyalty_rewards reemplazan a las de
-- 2026-10-16_loyalty_rewards_admin_only.sql.
--
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

-- ---------------------------------------------------------------------------
-- Permisos guardados en cada rol.
-- ---------------------------------------------------------------------------
alter table public.role_definitions add column if not exists nav_tabs text[];
alter table public.role_definitions add column if not exists actions text[] not null default '{}';

update public.role_definitions
set nav_tabs = array['orders', 'caja', 'local_expenses']
where name = 'cashier' and nav_tabs is null;

-- ---------------------------------------------------------------------------
-- ¿Puede este rol hacer esta acción? staff es el nombre viejo del cajero.
-- ---------------------------------------------------------------------------
create or replace function public.role_can(p_role text, p_action text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	with r as (
		select case lower(btrim(coalesce(p_role, '')))
			when 'staff' then 'cashier'
			else lower(btrim(coalesce(p_role, '')))
		end as name
	)
	select case
		when (select name from r) in ('owner', 'admin', 'ceo') then true
		else exists (
			select 1 from public.role_definitions rd, r
			where rd.name = r.name and p_action = any(rd.actions)
		)
	end;
$$;

-- La misma pregunta para la sesión actual (políticas RLS). Igual que is_admin():
-- cualquier fila activa del usuario con un rol que lo permita, o super admin.
create or replace function public.current_user_can(p_action text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
set row_security to 'off'
as $$
	select public.is_super_admin() or exists (
		select 1 from public.users u
		where u.auth_user_id = auth.uid()
			and coalesce(u.is_active, true)
			and public.role_can(u.role, p_action)
	);
$$;

revoke all on function public.role_can(text, text) from public, anon;
grant execute on function public.role_can(text, text) to authenticated, service_role;
revoke all on function public.current_user_can(text) from public, anon;
grant execute on function public.current_user_can(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Recompensas por puntos: quien tenga loyalty_rewards.manage (owner/admin/ceo siempre).
-- ---------------------------------------------------------------------------
drop policy if exists loyalty_rewards_insert_admin on public.loyalty_rewards;
drop policy if exists loyalty_rewards_update_admin on public.loyalty_rewards;
drop policy if exists loyalty_rewards_delete_admin on public.loyalty_rewards;
drop policy if exists loyalty_rewards_insert_manage on public.loyalty_rewards;
drop policy if exists loyalty_rewards_update_manage on public.loyalty_rewards;
drop policy if exists loyalty_rewards_delete_manage on public.loyalty_rewards;

create policy loyalty_rewards_insert_manage on public.loyalty_rewards for insert
	with check (company_id = current_user_company_id() and current_user_can('loyalty_rewards.manage'));
create policy loyalty_rewards_update_manage on public.loyalty_rewards for update
	using (company_id = current_user_company_id() and current_user_can('loyalty_rewards.manage'))
	with check (company_id = current_user_company_id() and current_user_can('loyalty_rewards.manage'));
create policy loyalty_rewards_delete_manage on public.loyalty_rewards for delete
	using (company_id = current_user_company_id() and current_user_can('loyalty_rewards.manage'));

-- ---------------------------------------------------------------------------
-- Reembolsos: orders.refund.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refund_order_payment_v2(p_order_id text, p_client_request_id uuid, p_amount_minor bigint, p_payment_line_id uuid, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_actor jsonb:=public.manual_order_actor(); v_order record; v_existing jsonb; v_shift uuid; v_line record; v_digits integer; v_refund jsonb; v_line_refunded bigint:=0; v_total_refunded bigint:=0; v_balance bigint;
begin
	if not public.role_can(v_actor->>'role', 'orders.refund') then raise exception 'refund_not_allowed'; end if;
	if length(trim(coalesce(p_reason,'')))<3 then raise exception 'refund_reason_required'; end if;
  select to_jsonb(r) into v_existing from public.order_payment_refunds r where r.company_id::text=v_actor->>'company_id' and r.client_request_id=p_client_request_id;
  if v_existing is not null then return v_existing || '{"idempotentReplay":true}'::jsonb; end if;
  select o.* into v_order from public.orders o where o.id::text=p_order_id and o.company_id::text=v_actor->>'company_id' for update;
	if not found then raise exception 'order_not_found_or_not_allowed'; end if;
  select * into v_line from public.order_payment_lines where id=p_payment_line_id and order_id=p_order_id and company_id=v_order.company_id;
	select coalesce(sum(amount_minor),0) into v_line_refunded from public.order_payment_refunds where company_id=v_order.company_id and order_id=p_order_id and payment_line_id=p_payment_line_id;
  if v_line.id is null or p_amount_minor<=0 or p_amount_minor>v_line.amount_minor-v_line_refunded then raise exception 'invalid_refund'; end if;
  select id into v_shift from public.cash_shifts where branch_id=v_order.branch_id and company_id=v_order.company_id and status='open' order by created_at desc limit 1;
  if v_shift is null then raise exception 'cash_shift_required'; end if;
  v_digits:=public.manual_order_currency_digits(v_order.currency,null);
	execute format($cash$select public.cash_add_movement(
	  p_shift_id => $1, p_type => 'expense', p_amount => $2,
	  p_description => $3, p_payment_method => $4, p_order_id => %L
	)$cash$, p_order_id)
	using v_shift, p_amount_minor::numeric/power(10::numeric,v_digits), 'Devolución pedido #'||p_order_id, v_line.rail;
  insert into public.order_payment_refunds(company_id,order_id,client_request_id,payment_line_id,amount_minor,currency,reason,authorized_by)
  values(v_order.company_id,p_order_id,p_client_request_id,p_payment_line_id,p_amount_minor,v_order.currency,left(trim(p_reason),300),auth.uid()) returning to_jsonb(order_payment_refunds) into v_refund;
	update public.cash_movements set amount_minor=p_amount_minor,currency=v_order.currency
	where id=(select cm.id from public.cash_movements cm where cm.shift_id=v_shift and cm.order_id::text=p_order_id and cm.amount_minor is null order by cm.created_at desc limit 1);
	select coalesce(sum(amount_minor),0) into v_total_refunded from public.order_payment_refunds where company_id=v_order.company_id and order_id=p_order_id;
	v_balance:=greatest(0,v_order.total_minor-(select coalesce(sum(amount_minor),0) from public.order_payment_lines where company_id=v_order.company_id and order_id=p_order_id)+v_total_refunded);
	update public.orders set payment_balance_minor=v_balance,payment_status=case when v_balance=0 then 'paid' when v_balance<total_minor then 'partial' else 'pending' end,
		payment_timing=case when v_balance=0 then 'immediate' else 'deferred' end where id::text=p_order_id and company_id=v_order.company_id;
  return v_refund;
end;
$function$
;

-- ---------------------------------------------------------------------------
-- Costo de envío a mano: orders.delivery_fee_override (zonas con nombre y por distancia).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_delivery_fee_for_role(p_user_role text, p_branch_id uuid, p_delivery_address jsonb, p_subtotal numeric, p_requested_fee numeric, p_manual_override boolean DEFAULT NULL::boolean)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
	v_settings jsonb;
	v_strategy text;
	v_named_areas jsonb;
	v_named_area_id text;
	v_configured_fee numeric;
	v_free_from numeric;
	v_minimum_subtotal numeric;
	v_role text := lower(btrim(coalesce(p_user_role, '')));
begin
	select coalesce(b.delivery_settings, '{}'::jsonb)
	into v_settings
	from public.branches b
	where b.id = p_branch_id;

	if not found then
		raise exception 'delivery_configuration_error' using errcode = '22000';
	end if;

	if coalesce((v_settings ->> 'enabled')::boolean, true) is false then
		raise exception 'delivery_disabled' using errcode = '22000';
	end if;

	v_named_areas := coalesce(
		v_settings -> 'namedAreas',
		v_settings -> 'named_areas',
		v_settings -> 'delivery_places',
		v_settings -> 'places',
		'[]'::jsonb
	);
	v_strategy := lower(coalesce(
		nullif(v_settings ->> 'deliveryPricingStrategy', ''),
		nullif(v_settings ->> 'delivery_pricing_strategy', ''),
		nullif(v_settings ->> 'pricingStrategy', ''),
		nullif(v_settings ->> 'pricing_mode', ''),
		case when jsonb_array_length(v_named_areas) > 0 then 'named_areas' else 'distance' end
	));

	if v_strategy in ('named_areas', 'namedareas')
		and jsonb_array_length(v_named_areas) > 0 then
		v_named_area_id := coalesce(
			nullif(btrim(p_delivery_address ->> 'named_area_id'), ''),
			nullif(btrim(p_delivery_address ->> 'namedAreaId'), ''),
			nullif(btrim(p_delivery_address ->> 'delivery_named_area_id'), ''),
			nullif(btrim(p_delivery_address ->> 'zone_id'), '')
		);

		if v_named_area_id is null then
			raise exception 'invalid_delivery_area' using errcode = '22000';
		end if;

		select coalesce(
			nullif(area ->> 'feeFlat', '')::numeric,
			nullif(area ->> 'fee_flat', '')::numeric,
			nullif(area ->> 'fee', '')::numeric
		)
		into v_configured_fee
		from jsonb_array_elements(v_named_areas) area
		where area ->> 'id' = v_named_area_id
		limit 1;

		if v_configured_fee is null or v_configured_fee < 0 then
			raise exception 'invalid_delivery_area' using errcode = '22000';
		end if;

		v_minimum_subtotal := coalesce(
			nullif(v_settings ->> 'minOrderSubtotal', '')::numeric,
			nullif(v_settings ->> 'min_order_subtotal', '')::numeric
		);
		if v_minimum_subtotal is not null
			and coalesce(p_subtotal, 0) < v_minimum_subtotal then
			raise exception 'delivery_minimum_subtotal' using errcode = '22000';
		end if;

		v_free_from := coalesce(
			nullif(v_settings ->> 'freeDeliveryFromSubtotal', '')::numeric,
			nullif(v_settings ->> 'free_delivery_from_subtotal', '')::numeric
		);
		if v_free_from is not null and coalesce(p_subtotal, 0) >= v_free_from then
			return 0;
		end if;

		-- A manual override is for owner/admin/ceo and roles granted orders.delivery_fee_override.
		-- Everyone else receives the exact server-configured zone fee.
		if p_manual_override is true and public.role_can(v_role, 'orders.delivery_fee_override') then
			if p_requested_fee is null or p_requested_fee < 0 then
				raise exception 'invalid_delivery_fee_override' using errcode = '22000';
			end if;
			return round(p_requested_fee, 2);
		end if;

		return round(v_configured_fee, 2);
	end if;

	return public.resolve_delivery_fee_for_role_legacy_v1(
		p_user_role,
		p_branch_id,
		p_delivery_address,
		p_subtotal,
		p_requested_fee,
		p_manual_override
	);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_delivery_fee_for_role_legacy_v1(p_user_role text, p_branch_id uuid, p_delivery_address jsonb, p_subtotal numeric, p_requested_fee numeric, p_manual_override boolean DEFAULT false)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
	v_settings jsonb;
	v_role text := lower(trim(coalesce(p_user_role, '')));
	v_free numeric;
	v_olat numeric;
	v_olng numeric;
	v_dlat numeric;
	v_dlng numeric;
	v_km numeric;
begin
	if public.role_can(v_role, 'orders.delivery_fee_override') and coalesce(p_manual_override, false) then
		return greatest(0, coalesce(p_requested_fee, 0));
	end if;

	select b.delivery_settings, b.origin_lat, b.origin_lng
	into v_settings, v_olat, v_olng
	from public.branches b
	where b.id = p_branch_id;

	if v_settings is null then return 0; end if;
	if coalesce((v_settings->>'enabled')::boolean, true) = false then return 0; end if;

	v_free := nullif(coalesce(
		v_settings->>'freeDeliveryFromSubtotal',
		v_settings->>'free_delivery_from_subtotal'
	), '')::numeric;
	if v_free is not null and coalesce(p_subtotal, 0) >= v_free then
		return 0;
	end if;

	v_dlat := nullif(p_delivery_address->>'lat', '')::numeric;
	v_dlng := nullif(p_delivery_address->>'lng', '')::numeric;
	if v_olat is not null and v_olng is not null and v_dlat is not null and v_dlng is not null then
		v_km := 2 * 6371 * asin(sqrt(
			power(sin(radians(v_dlat - v_olat) / 2), 2)
			+ cos(radians(v_olat)) * cos(radians(v_dlat)) * power(sin(radians(v_dlng - v_olng) / 2), 2)
		));
	else
		v_km := nullif(coalesce(
			p_delivery_address->>'delivery_km',
			p_delivery_address->>'km'
		), '')::numeric;
	end if;

	return public.resolve_distance_zone_fee(v_settings, coalesce(v_km, 0));
end;
$function$
;

commit;
