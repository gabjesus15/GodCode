-- Tanda 2 de 3: tasas de cambio de Venezuela (BCV dólar y euro) con historial. Va antes de desplegar.
--
-- Correr entero en el SQL editor de Supabase (pega todo y ejecuta). Va en una sola transacción:
-- si algo falla, no se aplica nada de esta tanda y el error dice dónde. Se puede volver a correr.
-- Antes: docs/db/2026-10/0-comprobacion-previa.sql con todo en «sí». Guía: docs/db/2026-10/LEEME.md.

begin;

-- Si alguna tabla está ocupada más de 5 segundos (pedidos entrando), se cancela en vez de dejar
-- el menú y la caja esperando. En ese caso, vuelve a correrla en un momento más tranquilo.
set local lock_timeout = '5s';


-- ============================================================
-- migrations/20261007_exchange_rates.sql
-- ============================================================

-- Tasas de cambio de Venezuela con historial y una fuente elegida por sucursal.
--
-- Antes la tasa era un número que el local escribía a mano en
-- `branches.delivery_settings.exchangeRate` (pantalla de Envío del Panel): cada cambio
-- pisaba el anterior y la tienda, además, mezclaba esa tasa con la del BCV en vivo.
-- Ahora el local elige una fuente y el sistema la mantiene al día:
--   bcv_usd       dólar oficial del BCV
--   bcv_eur       euro oficial del BCV (se aplica igual a los precios en dólares)
-- Solo fuentes oficiales: la tasa del P2P de Binance no se ofrece.
--
-- `exchange_rates` guarda cada valor distinto que publicó cada fuente: nunca se edita una
-- fila salvo `checked_at` (la última vez que se confirmó ese mismo valor). Las escribe solo
-- el servidor (`/api/tenant/exchange-rates`, con service role) a través de `record_exchange_rate`.
--
-- Cada pedido de una sucursal con fuente guarda la tasa vigente al crearse
-- (`orders.quoted_exchange_rate*`), sin tocar las RPC de pedidos: lo hace un trigger.
--
-- La contabilidad no cambia: los montos siguen en dólares. Los bolívares solo se muestran.

-- ============================================================
-- 1. Historial de tasas
-- ============================================================

create table if not exists public.exchange_rates (
  id           bigint generated always as identity primary key,
  source       text not null,
  rate         numeric(18, 6) not null,
  published_at timestamptz not null,
  fetched_at   timestamptz not null default now(),
  checked_at   timestamptz not null default now(),
  constraint exchange_rates_rate_chk check (rate > 0)
);

-- Se agrega aparte para que volver a correr el archivo también quite fuentes viejas (una
-- versión anterior aceptaba binance_usdt). `not valid` deja el historial que ya exista.
alter table public.exchange_rates
  drop constraint if exists exchange_rates_source_chk;
alter table public.exchange_rates
  add constraint exchange_rates_source_chk check (source in ('bcv_usd', 'bcv_eur')) not valid;

create index if not exists exchange_rates_source_latest_idx
  on public.exchange_rates (source, id desc);

alter table public.exchange_rates enable row level security;

-- Son datos públicos (los publica el BCV): cualquiera puede leerlos, nadie
-- puede escribirlos salvo el servidor.
drop policy if exists exchange_rates_public_read on public.exchange_rates;
create policy exchange_rates_public_read on public.exchange_rates
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.exchange_rates from anon, authenticated;
grant select on public.exchange_rates to anon, authenticated;

-- ============================================================
-- 2. Fuente por sucursal y registro de cambios
-- ============================================================

alter table public.branches
  add column if not exists exchange_rate_source text;

alter table public.branches
  drop constraint if exists branches_exchange_rate_source_chk;
-- Una versión anterior aceptaba binance_usdt: esas sucursales pasan al dólar BCV.
update public.branches
set exchange_rate_source = 'bcv_usd'
where exchange_rate_source is not null
  and exchange_rate_source not in ('bcv_usd', 'bcv_eur');
alter table public.branches
  add constraint branches_exchange_rate_source_chk
  check (exchange_rate_source is null or exchange_rate_source in ('bcv_usd', 'bcv_eur'));

-- Las sucursales de Venezuela arrancan con el dólar BCV, que es lo que ya usaba la tienda.
update public.branches b
set exchange_rate_source = 'bcv_usd'
where b.exchange_rate_source is null
  and (
    upper(btrim(coalesce(b.country, ''))) in ('VE', 'VENEZUELA')
    or exists (
      select 1 from public.companies c
      where c.id = b.company_id
        and upper(btrim(coalesce(c.country, ''))) in ('VE', 'VENEZUELA')
    )
  );

-- Las sucursales de Venezuela que se creen después (alta, «Arma y paga», súper admin)
-- también arrancan con el dólar BCV: ninguna de esas rutas manda la fuente.
create or replace function public.branches_default_exchange_rate_source()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.exchange_rate_source is null and (
    upper(btrim(coalesce(new.country, ''))) in ('VE', 'VENEZUELA')
    or exists (
      select 1 from public.companies c
      where c.id = new.company_id
        and upper(btrim(coalesce(c.country, ''))) in ('VE', 'VENEZUELA')
    )
  ) then
    new.exchange_rate_source := 'bcv_usd';
  end if;
  return new;
end;
$$;

drop trigger if exists branches_default_exchange_rate_source on public.branches;
create trigger branches_default_exchange_rate_source
  before insert or update of country, company_id on public.branches
  for each row execute function public.branches_default_exchange_rate_source();

create table if not exists public.branch_exchange_rate_source_changes (
  id          bigint generated always as identity primary key,
  company_id  uuid not null references public.companies(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  old_source  text,
  new_source  text not null,
  changed_by  uuid,
  changed_at  timestamptz not null default now()
);

create index if not exists branch_exchange_rate_source_changes_branch_idx
  on public.branch_exchange_rate_source_changes (branch_id, changed_at desc);

alter table public.branch_exchange_rate_source_changes enable row level security;

drop policy if exists branch_exchange_rate_source_changes_company_read on public.branch_exchange_rate_source_changes;
create policy branch_exchange_rate_source_changes_company_read on public.branch_exchange_rate_source_changes
  for select to authenticated
  using (public.is_super_admin() or company_id = public.current_user_company_id());

revoke insert, update, delete on public.branch_exchange_rate_source_changes from anon, authenticated;
grant select on public.branch_exchange_rate_source_changes to authenticated;

-- ============================================================
-- 3. Escribir una tasa (solo el servidor)
-- ============================================================

-- Si el último valor de la fuente es el mismo, solo actualiza `checked_at`; si cambió,
-- agrega una fila. Así el historial tiene una fila por valor distinto, no por consulta.
create or replace function public.record_exchange_rate(
  p_source text,
  p_rate numeric,
  p_published_at timestamptz
)
returns public.exchange_rates
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last public.exchange_rates;
  v_row public.exchange_rates;
begin
  if p_source is null or p_source not in ('bcv_usd', 'bcv_eur') then
    raise exception 'invalid_exchange_rate_source' using errcode = '22000';
  end if;
  if p_rate is null or p_rate <= 0 then
    raise exception 'invalid_exchange_rate' using errcode = '22000';
  end if;

  -- Dos peticiones a la vez no deben duplicar la fila.
  perform pg_advisory_xact_lock(hashtext('exchange_rates:' || p_source));

  select * into v_last
  from public.exchange_rates
  where source = p_source
  order by id desc
  limit 1;

  -- Solo cuenta el valor: dolarapi cambia la fecha de publicación cada día aunque la
  -- tasa sea la misma, y eso no debe abrir una fila nueva.
  if found and v_last.rate = round(p_rate, 6) then
    update public.exchange_rates
    set checked_at = now(),
        published_at = greatest(v_last.published_at, coalesce(p_published_at, v_last.published_at))
    where id = v_last.id
    returning * into v_row;
    return v_row;
  end if;

  insert into public.exchange_rates (source, rate, published_at)
  values (p_source, round(p_rate, 6), coalesce(p_published_at, now()))
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.record_exchange_rate(text, numeric, timestamptz) from public, anon, authenticated;
grant execute on function public.record_exchange_rate(text, numeric, timestamptz) to service_role;

-- ============================================================
-- 4. Tasa vigente de una sucursal
-- ============================================================

create or replace function public.branch_exchange_rate(p_branch_id uuid)
returns table (
  source text,
  rate_id bigint,
  rate numeric,
  published_at timestamptz,
  checked_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select b.exchange_rate_source, r.id, r.rate, r.published_at, r.checked_at
  from public.branches b
  left join lateral (
    select er.id, er.rate, er.published_at, er.checked_at
    from public.exchange_rates er
    where er.source = b.exchange_rate_source
    order by er.id desc
    limit 1
  ) r on true
  where b.id = p_branch_id
    and b.exchange_rate_source is not null;
$$;

revoke all on function public.branch_exchange_rate(uuid) from public;
grant execute on function public.branch_exchange_rate(uuid) to anon, authenticated, service_role;

-- ============================================================
-- 5. Cambiar la fuente de una sucursal (admin del negocio)
-- ============================================================

create or replace function public.set_branch_exchange_rate_source(
  p_branch_id uuid,
  p_source text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_company_id uuid;
  v_branch_company_id uuid;
  v_old text;
begin
  if p_source is null or p_source not in ('bcv_usd', 'bcv_eur') then
    raise exception 'invalid_exchange_rate_source' using errcode = '22000';
  end if;

  select b.company_id, b.exchange_rate_source
  into v_branch_company_id, v_old
  from public.branches b
  where b.id = p_branch_id
  for update;

  if v_branch_company_id is null then
    raise exception 'branch_not_found' using errcode = '22000';
  end if;

  if not public.is_super_admin() then
    select lower(btrim(u.role)), u.company_id
    into v_role, v_user_company_id
    from public.users u
    where u.auth_user_id = auth.uid() and coalesce(u.is_active, true) = true
    limit 1;

    if v_user_company_id is distinct from v_branch_company_id
       or v_role is null
       or v_role not in ('owner', 'admin', 'ceo') then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
  end if;

  if v_old is distinct from p_source then
    update public.branches
    set exchange_rate_source = p_source
    where id = p_branch_id;

    insert into public.branch_exchange_rate_source_changes
      (company_id, branch_id, old_source, new_source, changed_by)
    values (v_branch_company_id, p_branch_id, v_old, p_source, auth.uid());
  end if;

  return p_source;
end;
$$;

revoke all on function public.set_branch_exchange_rate_source(uuid, text) from public, anon;
grant execute on function public.set_branch_exchange_rate_source(uuid, text) to authenticated;

-- ============================================================
-- 6. Cada pedido guarda la tasa con que se le cotizó
-- ============================================================

alter table public.orders
  add column if not exists quoted_exchange_rate_id bigint references public.exchange_rates(id),
  add column if not exists quoted_exchange_rate numeric(18, 6),
  add column if not exists quoted_exchange_rate_source text;

create or replace function public.orders_set_quoted_exchange_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
  v_rate public.exchange_rates;
begin
  -- La tasa la pone siempre la base: lo que mande quien inserta se descarta.
  new.quoted_exchange_rate_id := null;
  new.quoted_exchange_rate := null;
  new.quoted_exchange_rate_source := null;

  if new.branch_id is null then
    return new;
  end if;

  select b.exchange_rate_source into v_source
  from public.branches b
  where b.id::text = new.branch_id::text;

  if v_source is null then
    return new;
  end if;

  select * into v_rate
  from public.exchange_rates
  where source = v_source
  order by id desc
  limit 1;

  if found then
    new.quoted_exchange_rate_id := v_rate.id;
    new.quoted_exchange_rate := v_rate.rate;
    new.quoted_exchange_rate_source := v_source;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_quoted_exchange_rate on public.orders;
create trigger orders_set_quoted_exchange_rate
  before insert on public.orders
  for each row execute function public.orders_set_quoted_exchange_rate();

-- PostgREST (la API de Supabase) recarga el esquema para ver las columnas y funciones nuevas.
notify pgrst, 'reload schema';

commit;
