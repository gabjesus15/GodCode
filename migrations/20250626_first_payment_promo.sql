-- Migration: first_payment_promo_used_at
-- Adds tracking for the "+1 free month on first payment" promotion.

alter table public.companies
  add column if not exists first_payment_promo_used_at timestamptz null;

comment on column public.companies.first_payment_promo_used_at is
  'Timestamp when the company consumed the "+1 free month on first payment" onboarding promotion. Null means the promo is still available for this company/email.';

-- Backfill existing active companies that have already paid so they do not consume the promo again.
-- We mark companies with an active subscription and a non-null subscription_ends_at as already used.
update public.companies
  set first_payment_promo_used_at = coalesce(subscription_ends_at, created_at, now())
where first_payment_promo_used_at is null
  and subscription_status = 'active'
  and subscription_ends_at is not null;

-- Optional index to speed up eligibility checks by email/normalized email.
create index if not exists idx_companies_first_payment_promo_used_at
  on public.companies (first_payment_promo_used_at);
