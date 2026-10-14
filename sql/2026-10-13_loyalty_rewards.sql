-- Canje de puntos de fidelidad: el negocio arma sus recompensas en el panel del local
-- (GodCode-Panel, pestaña Cupones → "Recompensas por puntos") y el cliente las canjea
-- desde Mi Cuenta del menú (Portal). Cada canje entrega un cupón de un solo uso ligado
-- a la cuenta, así que el pedido usa la maquinaria de cupones de siempre
-- (compute_order_coupon_discount / create_order_transaction) sin cambios.
--
-- Puntos disponibles = floor(gastado / 1000) - puntos de los canjes activos.
-- "Gastado" = clients.total_spent si es > 0; si no, la suma de orders.total no
-- cancelados. La misma regla vive en:
--   - GodCode-Panel: src/modules/cash/components/AdminClients.jsx (columna PUNTOS)
--   - Portal: lib/menu-account/points-rule.ts (Mi Cuenta)
-- Si cambia en un lado, cambia en los tres.
--
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

-- ---------------------------------------------------------------------------
-- Cupones: de dónde salen. Los de canje no se listan con los cupones normales.
-- ---------------------------------------------------------------------------
alter table public.discount_coupons
	add column if not exists source text not null default 'manual';

alter table public.discount_coupons
	drop constraint if exists discount_coupons_source_check;
alter table public.discount_coupons
	add constraint discount_coupons_source_check check (source in ('manual', 'loyalty'));

-- ---------------------------------------------------------------------------
-- Recompensas que ofrece cada negocio.
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_rewards (
	id uuid primary key default gen_random_uuid(),
	company_id uuid not null references public.companies(id) on delete cascade,
	title text not null check (char_length(btrim(title)) between 1 and 80),
	description text check (description is null or char_length(description) <= 400),
	points_cost integer not null check (points_cost > 0),
	-- 'product': un producto del menú, entregado como cupón por su valor.
	-- 'discount': un descuento (% o monto) sobre el pedido.
	kind text not null check (kind in ('product', 'discount')),
	product_id uuid references public.products(id) on delete set null,
	discount_type text not null check (discount_type in ('percent', 'fixed_amount')),
	discount_value numeric not null check (discount_value > 0),
	min_order_subtotal numeric check (min_order_subtotal is null or min_order_subtotal >= 0),
	-- Días que dura el cupón desde el canje; null = no vence.
	valid_days integer check (valid_days is null or valid_days between 1 and 3650),
	is_active boolean not null default true,
	sort_order integer not null default 0,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (discount_type <> 'percent' or discount_value <= 100)
);

create index if not exists loyalty_rewards_company_idx on public.loyalty_rewards (company_id, sort_order);

drop trigger if exists set_updated_at on public.loyalty_rewards;
create trigger set_updated_at before update on public.loyalty_rewards
	for each row execute function _trigger_set_updated_at();

alter table public.loyalty_rewards enable row level security;

-- Igual que discount_coupons: el personal de la empresa las ve y edita; solo admin borra.
-- El menú las lee desde el servidor del Portal (service_role), no con estas políticas.
drop policy if exists loyalty_rewards_select_tenant on public.loyalty_rewards;
create policy loyalty_rewards_select_tenant on public.loyalty_rewards for select
	using (company_id = current_user_company_id());
drop policy if exists loyalty_rewards_insert_tenant on public.loyalty_rewards;
create policy loyalty_rewards_insert_tenant on public.loyalty_rewards for insert
	with check (company_id = current_user_company_id());
drop policy if exists loyalty_rewards_update_tenant on public.loyalty_rewards;
create policy loyalty_rewards_update_tenant on public.loyalty_rewards for update
	using (company_id = current_user_company_id())
	with check (company_id = current_user_company_id());
drop policy if exists loyalty_rewards_delete_admin on public.loyalty_rewards;
create policy loyalty_rewards_delete_admin on public.loyalty_rewards for delete
	using (company_id = current_user_company_id() and is_admin());

-- ---------------------------------------------------------------------------
-- Canjes. Solo los escribe redeem_loyalty_reward; el panel los lee.
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_redemptions (
	id uuid primary key default gen_random_uuid(),
	company_id uuid not null references public.companies(id) on delete cascade,
	account_id uuid references public.menu_client_accounts(id) on delete set null,
	client_id uuid references public.clients(id) on delete set null,
	reward_id uuid references public.loyalty_rewards(id) on delete set null,
	-- Copia al canjear: la recompensa puede cambiar o borrarse después.
	reward_title text not null,
	points_cost integer not null check (points_cost > 0),
	coupon_id uuid references public.discount_coupons(id) on delete set null,
	-- 'cancelled' devuelve los puntos (no hay pantalla para eso todavía).
	status text not null default 'active' check (status in ('active', 'cancelled')),
	created_at timestamptz not null default now()
);

create index if not exists loyalty_redemptions_client_idx
	on public.loyalty_redemptions (company_id, client_id) where status = 'active';
create index if not exists loyalty_redemptions_account_idx
	on public.loyalty_redemptions (account_id, created_at desc);

alter table public.loyalty_redemptions enable row level security;

drop policy if exists loyalty_redemptions_select_tenant on public.loyalty_redemptions;
create policy loyalty_redemptions_select_tenant on public.loyalty_redemptions for select
	using (company_id = current_user_company_id());

-- ---------------------------------------------------------------------------
-- Canjear. Solo el Portal (service_role) con la sesión de la cuenta ya validada.
-- ---------------------------------------------------------------------------
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
	v_earned := greatest(0, floor(v_spent / 1000))::integer;

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
