-- Cupones del alta (la suscripción del SaaS). No confundir con `discount_coupons`, que son
-- los cupones que cada restaurante crea para sus comensales en el carrito.
--
-- Los crea el super admin en /cupones y la persona escribe el código en el paso 3 del alta
-- (/onboarding/pago). Tres tipos:
--   percent      → descuento porcentual sobre el total del primer pago (plan × meses + extras)
--   fixed        → descuento fijo en USD sobre ese total (tope: el total; a 0 el alta se
--                  activa sin cobrar, con referencia `coupon-…`)
--   free_months  → meses de regalo que se suman a los pagados (el importe no cambia)
-- `keeps_promo` dice si además se mantiene la promo pública «+1 mes gratis en tu primer
-- pago»; `plan_ids` limita el cupón a ciertos planes (null = todos); `min_months` exige pagar
-- al menos esos meses. Cada correo puede usar cada cupón una sola vez (índice único en los
-- canjes) y `max_redemptions` acota los usos totales.
--
-- La solicitud guarda el cupón elegido (`coupon_id`, `coupon_code`) al aplicarlo y, al
-- iniciar el pago, la foto de lo prometido (`coupon_discount_usd`, `coupon_free_months`,
-- `coupon_keeps_promo`): si el cupón vence entre el comprobante y la validación, se honra lo
-- que vio la persona. El cierre del alta lo canjea con `redeem_subscription_coupon`, que es
-- idempotente por (cupón, correo).

begin;

-- ============================================================
-- 1. Cupones
-- ============================================================

create table if not exists public.subscription_coupons (
  id                uuid primary key default gen_random_uuid(),
  code              text not null,
  description       text,
  kind              text not null,
  value             numeric(12, 2) not null,
  min_months        integer not null default 1,
  plan_ids          uuid[],
  keeps_promo       boolean not null default true,
  max_redemptions   integer,
  redemptions_count integer not null default 0,
  valid_from        timestamptz,
  valid_until       timestamptz,
  is_active         boolean not null default true,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint subscription_coupons_code_format
    check (code ~ '^[A-Z0-9][A-Z0-9_-]{3,31}$'),
  constraint subscription_coupons_kind
    check (kind in ('percent', 'fixed', 'free_months')),
  constraint subscription_coupons_value check (
    (kind = 'percent' and value > 0 and value <= 100)
    or (kind = 'fixed' and value > 0)
    or (kind = 'free_months' and value >= 1 and value <= 12 and value = trunc(value))
  ),
  constraint subscription_coupons_min_months check (min_months between 1 and 12),
  constraint subscription_coupons_max_redemptions
    check (max_redemptions is null or max_redemptions > 0),
  constraint subscription_coupons_window
    check (valid_from is null or valid_until is null or valid_until > valid_from),
  constraint subscription_coupons_description_len
    check (description is null or char_length(description) <= 200)
);

create unique index if not exists subscription_coupons_code_key
  on public.subscription_coupons (code);
create index if not exists subscription_coupons_active_idx
  on public.subscription_coupons (is_active, valid_until);

drop trigger if exists trg_subscription_coupons_updated_at on public.subscription_coupons;
create or replace function public.set_subscription_coupons_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_subscription_coupons_updated_at
  before update on public.subscription_coupons
  for each row execute function public.set_subscription_coupons_updated_at();

-- ============================================================
-- 2. Canjes
-- ============================================================

create table if not exists public.subscription_coupon_redemptions (
  id                uuid primary key default gen_random_uuid(),
  coupon_id         uuid not null references public.subscription_coupons(id) on delete cascade,
  application_id    uuid references public.onboarding_applications(id) on delete set null,
  company_id        uuid references public.companies(id) on delete set null,
  email_normalized  text not null,
  payment_reference text,
  base_amount_usd   numeric(12, 2) not null default 0,
  discount_usd      numeric(12, 2) not null default 0,
  free_months       integer not null default 0,
  redeemed_at       timestamptz not null default now()
);

-- Un correo canjea cada cupón una sola vez.
create unique index if not exists subscription_coupon_redemptions_once_per_email
  on public.subscription_coupon_redemptions (coupon_id, email_normalized);
create index if not exists subscription_coupon_redemptions_coupon_idx
  on public.subscription_coupon_redemptions (coupon_id, redeemed_at desc);
create index if not exists subscription_coupon_redemptions_company_idx
  on public.subscription_coupon_redemptions (company_id)
  where company_id is not null;

-- ============================================================
-- 3. El cupón en la solicitud
-- ============================================================

alter table public.onboarding_applications
  add column if not exists coupon_id uuid references public.subscription_coupons(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists coupon_discount_usd numeric(12, 2),
  add column if not exists coupon_free_months integer,
  add column if not exists coupon_keeps_promo boolean;

create index if not exists onboarding_applications_coupon_idx
  on public.onboarding_applications (coupon_id)
  where coupon_id is not null;

comment on column public.onboarding_applications.coupon_id is
  'Cupón del alta aplicado en el paso de pago (subscription_coupons). Se canjea al cerrar el alta.';
comment on column public.onboarding_applications.coupon_discount_usd is
  'Descuento prometido en USD al iniciar el pago; payment_amount ya lo tiene restado.';
comment on column public.onboarding_applications.coupon_free_months is
  'Meses de regalo del cupón prometidos al iniciar el pago (se suman a los pagados).';
comment on column public.onboarding_applications.coupon_keeps_promo is
  'Si al iniciar el pago el cupón dejaba vigente la promo de +1 mes del primer pago.';

-- ============================================================
-- 4. RLS: solo el equipo; el código del alta entra con service role
-- ============================================================

alter table public.subscription_coupons enable row level security;
alter table public.subscription_coupon_redemptions enable row level security;

drop policy if exists admin_full_access on public.subscription_coupons;
create policy admin_full_access on public.subscription_coupons
  for all using (is_super_admin()) with check (is_super_admin());

drop policy if exists admin_full_access on public.subscription_coupon_redemptions;
create policy admin_full_access on public.subscription_coupon_redemptions
  for all using (is_super_admin()) with check (is_super_admin());

-- ============================================================
-- 5. Canje atómico e idempotente
-- ============================================================

create or replace function public.redeem_subscription_coupon(
  p_coupon_id uuid,
  p_email text,
  p_application_id uuid default null,
  p_company_id uuid default null,
  p_payment_reference text default null,
  p_base_amount_usd numeric default 0,
  p_discount_usd numeric default 0,
  p_free_months integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_inserted uuid;
begin
  if p_coupon_id is null or v_email = '' then
    return false;
  end if;

  insert into public.subscription_coupon_redemptions (
    coupon_id, application_id, company_id, email_normalized, payment_reference,
    base_amount_usd, discount_usd, free_months
  )
  values (
    p_coupon_id, p_application_id, p_company_id, v_email, p_payment_reference,
    coalesce(p_base_amount_usd, 0), coalesce(p_discount_usd, 0), coalesce(p_free_months, 0)
  )
  on conflict (coupon_id, email_normalized) do nothing
  returning id into v_inserted;

  -- Ya estaba canjeado por este correo: no se cuenta dos veces.
  if v_inserted is null then
    return false;
  end if;

  update public.subscription_coupons
     set redemptions_count = redemptions_count + 1
   where id = p_coupon_id;

  return true;
end;
$$;

revoke all on function public.redeem_subscription_coupon(uuid, text, uuid, uuid, text, numeric, numeric, integer) from public;
revoke all on function public.redeem_subscription_coupon(uuid, text, uuid, uuid, text, numeric, numeric, integer) from anon, authenticated;
grant execute on function public.redeem_subscription_coupon(uuid, text, uuid, uuid, text, numeric, numeric, integer) to service_role;

commit;
