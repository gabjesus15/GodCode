-- Reglas para ganar puntos, por negocio, y registro de los puntos que da cada pedido.
--
-- Antes los puntos se calculaban al vuelo con una sola regla (gastado / points_per_amount),
-- así que cambiar la regla le cambiaba el saldo a todos y cancelar un pedido no restaba.
-- Ahora:
--   - El CEO arma reglas en /cuenta › Mi menú (GodCode, app/api/customer-account/loyalty-rules):
--     globales (por dinero gastado o por compra), por producto y por categoría. Se combinan,
--     y una regla con fechas es una promoción que reemplaza a la permanente mientras dura.
--   - Cada pedido guarda en loyalty_ledger los puntos que ganó al crearse. Cambiar las
--     reglas no toca lo ya ganado; cancelar el pedido le quita sus puntos.
--   - Saldo = suma del registro - canjes activos. Lo calcula la base para todos: el panel
--     (loyalty_balances), Mi Cuenta y el canje (loyalty_client_balance).
--
-- Al aplicarse, cada negocio recibe una regla global con su regla de hoy (1 por cada
-- loyalty_settings.points_per_amount, o 1000) y cada ficha una fila de apertura con los
-- puntos que tenía: nadie pierde nada. Los pedidos anteriores quedan cubiertos por esa
-- apertura; el registro por pedido empieza en loyalty_settings.ledger_started_at.
--
-- Requiere 2026-10-13_loyalty_rewards.sql y 2026-10-13_loyalty_settings.sql.
-- Aplicar en una sola transacción. Antes: pg_dump -Fc a /root/backups.

begin;

-- ---------------------------------------------------------------------------
-- Reglas
-- ---------------------------------------------------------------------------
create table if not exists public.loyalty_earn_rules (
	id uuid primary key default gen_random_uuid(),
	company_id uuid not null references public.companies(id) on delete cascade,
	name text check (name is null or char_length(name) <= 80),
	-- 'global': todo el pedido; 'product' / 'category': por unidad de esos productos.
	scope text not null check (scope in ('global', 'product', 'category')),
	product_id uuid references public.products(id) on delete cascade,
	category_id uuid references public.categories(id) on delete cascade,
	-- Solo global: 'per_amount' = points por cada per_amount gastado; 'per_order' = points por compra.
	mode text check (mode in ('per_amount', 'per_order')),
	points integer not null check (points >= 0 and points <= 1000000),
	per_amount numeric check (per_amount is null or (per_amount > 0 and per_amount <= 100000000)),
	-- Con fechas es una promoción: mientras está vigente reemplaza a las permanentes de su nivel.
	starts_at timestamptz,
	ends_at timestamptz,
	is_active boolean not null default true,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	check (ends_at is null or starts_at is null or ends_at > starts_at),
	check (
		(scope = 'global' and product_id is null and category_id is null and mode is not null
			and (mode = 'per_order' or per_amount is not null))
		or (scope = 'product' and product_id is not null and category_id is null and mode is null)
		or (scope = 'category' and category_id is not null and product_id is null and mode is null)
	)
);

create index if not exists loyalty_earn_rules_company_idx on public.loyalty_earn_rules (company_id) where is_active;

drop trigger if exists set_updated_at on public.loyalty_earn_rules;
create trigger set_updated_at before update on public.loyalty_earn_rules
	for each row execute function _trigger_set_updated_at();

alter table public.loyalty_earn_rules enable row level security;

-- El personal las ve; las escribe solo el Portal (CEO, service_role).
drop policy if exists loyalty_earn_rules_select_tenant on public.loyalty_earn_rules;
create policy loyalty_earn_rules_select_tenant on public.loyalty_earn_rules for select
	using (company_id = current_user_company_id());

-- ---------------------------------------------------------------------------
-- Registro de puntos
-- ---------------------------------------------------------------------------
alter table public.loyalty_settings
	add column if not exists ledger_started_at timestamptz;

create table if not exists public.loyalty_ledger (
	id uuid primary key default gen_random_uuid(),
	company_id uuid not null references public.companies(id) on delete cascade,
	client_id uuid not null references public.clients(id) on delete cascade,
	-- null en la apertura.
	order_id bigint references public.orders(id) on delete cascade,
	points integer not null,
	kind text not null check (kind in ('order', 'opening')),
	created_at timestamptz not null default now()
);

create unique index if not exists loyalty_ledger_order_uidx on public.loyalty_ledger (order_id) where order_id is not null;
create index if not exists loyalty_ledger_client_idx on public.loyalty_ledger (company_id, client_id);

alter table public.loyalty_ledger enable row level security;

drop policy if exists loyalty_ledger_select_tenant on public.loyalty_ledger;
create policy loyalty_ledger_select_tenant on public.loyalty_ledger for select
	using (company_id = current_user_company_id());

-- ---------------------------------------------------------------------------
-- Puntos de un pedido con las reglas vigentes en p_at
-- ---------------------------------------------------------------------------
create or replace function public.loyalty_points_for_order(
	p_company_id uuid, p_items jsonb, p_total numeric, p_at timestamptz
) returns integer
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	with live as (
		select r.*, (r.starts_at is not null or r.ends_at is not null) as is_promo
		from public.loyalty_earn_rules r
		where r.company_id = p_company_id
			and r.is_active
			and (r.starts_at is null or r.starts_at <= p_at)
			and (r.ends_at is null or r.ends_at >= p_at)
	),
	-- Global: por cada modo, si hay promos vigentes valen solo ellas; si no, las permanentes.
	global_rules as (
		select g.* from live g
		where g.scope = 'global'
			and g.is_promo = exists (select 1 from live p where p.scope = 'global' and p.mode = g.mode and p.is_promo)
	),
	global_points as (
		select coalesce(sum(
			case when g.mode = 'per_amount' then floor(greatest(coalesce(p_total, 0), 0) / g.per_amount) * g.points
				else g.points end
		), 0) as pts
		from global_rules g
	),
	-- Productos del pedido (sin extras), con su categoría.
	lines as (
		select (it ->> 'id')::uuid as product_id,
			greatest(floor(coalesce((it ->> 'quantity')::numeric, 1)), 0) as qty
		from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) it
		where coalesce((it ->> 'is_extra')::boolean, false) = false
			and (it ->> 'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
	),
	line_points as (
		select l.qty * coalesce((
			-- Una sola regla por producto: promo del producto > producto > promo de la categoría > categoría.
			select r.points from live r
			where (r.scope = 'product' and r.product_id = l.product_id)
				or (r.scope = 'category' and r.category_id = p.category_id)
			order by case
				when r.scope = 'product' and r.is_promo then 1
				when r.scope = 'product' then 2
				when r.is_promo then 3
				else 4 end,
				r.created_at desc
			limit 1
		), 0) as pts
		from lines l
		left join public.products p on p.id = l.product_id and p.company_id = p_company_id
	)
	select greatest(0, (select pts from global_points) + coalesce((select sum(pts) from line_points), 0))::integer;
$$;

revoke all on function public.loyalty_points_for_order(uuid, jsonb, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.loyalty_points_for_order(uuid, jsonb, numeric, timestamptz) to service_role;

-- ---------------------------------------------------------------------------
-- Trigger: cada pedido escribe (o corrige) su fila del registro
-- ---------------------------------------------------------------------------
create or replace function public.loyalty_ledger_sync_order()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
	v_started timestamptz;
	v_points integer;
begin
	-- Un error aquí nunca puede impedir crear o actualizar un pedido.
	begin
		select s.ledger_started_at into v_started from public.loyalty_settings s where s.company_id = new.company_id;
		-- Pedidos anteriores al registro: sus puntos ya están en la apertura. Un negocio
		-- nuevo (sin fila) registra desde el primero.
		if v_started is not null and new.created_at < v_started then
			return null;
		end if;

		if tg_op = 'UPDATE' then
			-- Un cambio de estado (pendiente → listo → entregado) no recalcula: el pedido
			-- conserva lo que ganó aunque las reglas hayan cambiado después.
			if new.status is distinct from 'cancelled'
				and old.status is distinct from 'cancelled'
				and old.items is not distinct from new.items
				and old.total is not distinct from new.total
				and old.client_id is not distinct from new.client_id
				and exists (select 1 from public.loyalty_ledger l where l.order_id = new.id) then
				return null;
			end if;
			delete from public.loyalty_ledger where order_id = new.id;
		end if;

		if new.client_id is null or new.status = 'cancelled' then
			return null;
		end if;

		v_points := public.loyalty_points_for_order(new.company_id, new.items, new.total, new.created_at);
		insert into public.loyalty_ledger (company_id, client_id, order_id, points, kind, created_at)
		values (new.company_id, new.client_id, new.id, v_points, 'order', new.created_at);
	exception when others then
		raise warning 'loyalty_ledger_sync_order % failed: %', new.id, sqlerrm;
	end;
	return null;
end;
$$;

drop trigger if exists loyalty_ledger_after_insert on public.orders;
create trigger loyalty_ledger_after_insert after insert on public.orders
	for each row execute function public.loyalty_ledger_sync_order();

drop trigger if exists loyalty_ledger_after_update on public.orders;
create trigger loyalty_ledger_after_update after update of status, items, total, client_id on public.orders
	for each row
	when (old.status is distinct from new.status or old.items is distinct from new.items
		or old.total is distinct from new.total or old.client_id is distinct from new.client_id)
	execute function public.loyalty_ledger_sync_order();

-- ---------------------------------------------------------------------------
-- Saldos
-- ---------------------------------------------------------------------------
create or replace function public.loyalty_client_balance(p_company_id uuid, p_client_id uuid)
returns table (earned integer, redeemed integer, available integer)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
	with e as (
		select coalesce(sum(l.points), 0)::integer as v from public.loyalty_ledger l
		where l.company_id = p_company_id and l.client_id = p_client_id
	), r as (
		select coalesce(sum(x.points_cost), 0)::integer as v from public.loyalty_redemptions x
		where x.company_id = p_company_id and x.client_id = p_client_id and x.status = 'active'
	)
	select e.v, r.v, greatest(0, e.v - r.v) from e, r;
$$;

revoke all on function public.loyalty_client_balance(uuid, uuid) from public, anon, authenticated;
grant execute on function public.loyalty_client_balance(uuid, uuid) to service_role;

-- Para la columna PUNTOS del panel: solo el personal de esa empresa.
create or replace function public.loyalty_balances(p_company_id uuid)
returns table (client_id uuid, earned integer, redeemed integer, available integer)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
	if p_company_id is distinct from public.current_user_company_id() and not public.is_super_admin() then
		raise exception 'not_allowed' using errcode = '42501';
	end if;
	return query
	with e as (
		select l.client_id, sum(l.points)::integer as v from public.loyalty_ledger l
		where l.company_id = p_company_id group by l.client_id
	), r as (
		select x.client_id, sum(x.points_cost)::integer as v from public.loyalty_redemptions x
		where x.company_id = p_company_id and x.status = 'active' and x.client_id is not null group by x.client_id
	)
	select coalesce(e.client_id, r.client_id), coalesce(e.v, 0), coalesce(r.v, 0),
		greatest(0, coalesce(e.v, 0) - coalesce(r.v, 0))
	from e full join r on r.client_id = e.client_id;
end;
$$;

revoke all on function public.loyalty_balances(uuid) from public, anon;
grant execute on function public.loyalty_balances(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Canje: el saldo sale del registro (mismo flujo que antes)
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
	perform 1 from public.clients
	where id = v_account.client_id and company_id = v_account.company_id
	for update;
	if not found then
		raise exception 'account_not_found' using errcode = 'P0001';
	end if;

	select b.available into v_available
	from public.loyalty_client_balance(v_account.company_id, v_account.client_id) b;

	if coalesce(v_available, 0) < v_reward.points_cost then
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

-- ---------------------------------------------------------------------------
-- Arranque: regla base por negocio, apertura por ficha y fecha de inicio del registro
-- ---------------------------------------------------------------------------
insert into public.loyalty_settings (company_id)
select c.id from public.companies c
on conflict (company_id) do nothing;

-- Regla base = la de hoy, para que nada cambie hasta que el CEO arme las suyas.
insert into public.loyalty_earn_rules (company_id, name, scope, mode, points, per_amount)
select s.company_id, 'Regla base', 'global', 'per_amount', 1, coalesce(s.points_per_amount, 1000)
from public.loyalty_settings s
where s.ledger_started_at is null
	and not exists (select 1 from public.loyalty_earn_rules r where r.company_id = s.company_id);

-- Apertura: lo que cada ficha tenía ganado con la regla de hoy (antes de restar canjes).
insert into public.loyalty_ledger (company_id, client_id, points, kind)
select c.company_id, c.id, x.pts, 'opening'
from public.clients c
join public.loyalty_settings s on s.company_id = c.company_id and s.ledger_started_at is null
cross join lateral (
	select floor(
		(case when coalesce(c.total_spent, 0) > 0 then c.total_spent
			else (select coalesce(sum(o.total), 0) from public.orders o
				where o.client_id = c.id and o.company_id = c.company_id and o.status is distinct from 'cancelled')
		end) / coalesce(s.points_per_amount, 1000)
	)::integer as pts
) x
where x.pts > 0;

update public.loyalty_settings set ledger_started_at = now() where ledger_started_at is null;

commit;
