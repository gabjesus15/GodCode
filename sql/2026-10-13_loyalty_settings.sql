-- Regla de puntos por negocio: cuánto gasto vale 1 punto. Antes era fija (1 punto por cada
-- 1000), que en pesos chilenos funciona pero en un negocio con precios en dólares o en
-- bolívares a tasa casi no da puntos. Sin fila, sigue valiendo 1000: nada cambia para los
-- negocios que no la configuren.
--
-- La usan los tres lugares que calculan puntos:
--   - GodCode-Panel: src/modules/cash/components/AdminClients.jsx (columna PUNTOS) y la
--     vista Cupones → Recompensas por puntos, donde se configura.
--   - Portal: lib/menu-account/points.ts (Mi Cuenta).
--   - redeem_loyalty_reward (abajo; reemplaza la de 2026-10-13_loyalty_rewards.sql).
--
-- Requiere 2026-10-13_loyalty_rewards.sql. Aplicar en una sola transacción.
-- Antes: pg_dump -Fc a /root/backups.

begin;

create table if not exists public.loyalty_settings (
	company_id uuid primary key references public.companies(id) on delete cascade,
	-- Gasto, en la moneda del negocio, que vale 1 punto.
	points_per_amount numeric not null default 1000 check (points_per_amount > 0 and points_per_amount <= 100000000),
	updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.loyalty_settings;
create trigger set_updated_at before update on public.loyalty_settings
	for each row execute function _trigger_set_updated_at();

alter table public.loyalty_settings enable row level security;

-- El personal ve la regla (la columna PUNTOS la usa); solo admin/owner/ceo la cambia.
drop policy if exists loyalty_settings_select_tenant on public.loyalty_settings;
create policy loyalty_settings_select_tenant on public.loyalty_settings for select
	using (company_id = current_user_company_id());
drop policy if exists loyalty_settings_insert_admin on public.loyalty_settings;
create policy loyalty_settings_insert_admin on public.loyalty_settings for insert
	with check (company_id = current_user_company_id() and is_admin());
drop policy if exists loyalty_settings_update_admin on public.loyalty_settings;
create policy loyalty_settings_update_admin on public.loyalty_settings for update
	using (company_id = current_user_company_id() and is_admin())
	with check (company_id = current_user_company_id() and is_admin());

-- Mismo canje que antes; solo cambia el divisor de "gastado / 1000".
create or replace function public.redeem_loyalty_reward(p_account_id uuid, p_reward_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
	v_account public.menu_client_accounts%rowtype;
	v_reward public.loyalty_rewards%rowtype;
	v_total_spent numeric;
	v_spent numeric;
	v_per_amount numeric;
	v_earned integer;
	v_redeemed integer;
	v_available integer;
	v_code text;
	v_valid_until timestamptz;
	v_coupon_id uuid;
	v_redemption_id uuid;
	i int;
begin
	select * into v_account from public.menu_client_accounts
	where id = p_account_id and is_active;
	if not found or v_account.client_id is null then
		raise exception 'account_not_found' using errcode = 'P0001';
	end if;

	select * into v_reward from public.loyalty_rewards
	where id = p_reward_id and company_id = v_account.company_id and is_active;
	if not found then
		raise exception 'reward_unavailable' using errcode = 'P0001';
	end if;

	-- Bloquea la ficha: dos canjes a la vez no pueden gastar el mismo saldo.
	select total_spent into v_total_spent from public.clients
	where id = v_account.client_id and company_id = v_account.company_id
	for update;
	if not found then
		raise exception 'account_not_found' using errcode = 'P0001';
	end if;

	if coalesce(v_total_spent, 0) > 0 then
		v_spent := v_total_spent;
	else
		select coalesce(sum(o.total), 0) into v_spent from public.orders o
		where o.client_id = v_account.client_id
			and o.company_id = v_account.company_id
			and o.status is distinct from 'cancelled';
	end if;

	select s.points_per_amount into v_per_amount from public.loyalty_settings s
	where s.company_id = v_account.company_id;
	v_per_amount := coalesce(v_per_amount, 1000);
	v_earned := greatest(0, floor(v_spent / v_per_amount))::integer;

	select coalesce(sum(r.points_cost), 0) into v_redeemed from public.loyalty_redemptions r
	where r.client_id = v_account.client_id
		and r.company_id = v_account.company_id
		and r.status = 'active';
	v_available := greatest(0, v_earned - v_redeemed);

	if v_available < v_reward.points_cost then
		raise exception 'insufficient_points' using errcode = 'P0001';
	end if;

	-- Código corto, legible (sin 0/O/1/I) y único dentro de la empresa.
	for i in 1..20 loop
		v_code := 'PTS-' || (
			select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1), '')
			from generate_series(1, 6)
		);
		exit when not exists (
			select 1 from public.discount_coupons c
			where c.company_id = v_account.company_id and upper(btrim(c.code)) = v_code
		);
		v_code := null;
	end loop;
	if v_code is null then
		raise exception 'coupon_code_collision' using errcode = 'P0001';
	end if;

	v_valid_until := case when v_reward.valid_days is null then null
		else now() + make_interval(days => v_reward.valid_days) end;

	insert into public.discount_coupons (
		company_id, code, discount_type, discount_value, scope,
		restricted_client_id, restricted_account_id, min_order_subtotal,
		max_redemptions, max_redemptions_per_client, valid_from, valid_until, is_active, source
	) values (
		v_account.company_id, v_code, v_reward.discount_type, v_reward.discount_value, 'client_only',
		v_account.client_id, v_account.id, v_reward.min_order_subtotal,
		1, 1, now(), v_valid_until, true, 'loyalty'
	) returning id into v_coupon_id;

	insert into public.loyalty_redemptions (
		company_id, account_id, client_id, reward_id, reward_title, points_cost, coupon_id
	) values (
		v_account.company_id, v_account.id, v_account.client_id, v_reward.id, v_reward.title,
		v_reward.points_cost, v_coupon_id
	) returning id into v_redemption_id;

	return jsonb_build_object(
		'redemption_id', v_redemption_id,
		'coupon_code', v_code,
		'valid_until', v_valid_until,
		'points_left', v_available - v_reward.points_cost
	);
end;
$$;

revoke all on function public.redeem_loyalty_reward(uuid, uuid) from public, anon, authenticated;
grant execute on function public.redeem_loyalty_reward(uuid, uuid) to service_role;

commit;
