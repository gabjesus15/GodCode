-- Venezuela: cobro en bolívares o mixto con la tasa fijada por la base, vuelto en otra
-- moneda y caja por moneda (apertura, arqueo y cierre con su tasa).
--
-- Requiere 20261007_exchange_rates.sql (tabla `exchange_rates` y
-- `branches.exchange_rate_source`).
--
-- Regla de negocio: la contabilidad va siempre en la moneda contable del pedido (dólares
-- en Venezuela). Los bolívares son una forma de pago: cada línea guarda cuánto se recibió
-- en Bs y con qué tasa, para poder cuadrar la caja en Bs y en dólares por separado.
--
-- Qué cambia:
--   1. `settle_order_payment_v3` (versión de
--      GodCode-Panel/supabase/migrations/20260724130000_fix_settle_order_payment_v3_text_order_id_cast.sql):
--      * la tasa que manda el navegador solo se acepta si está a 0,5 % o menos de la tasa
--        vigente de la sucursal (o de la que se le cotizó al cliente en el pedido), y la
--        línea guarda qué tasa del historial se usó;
--      * vuelto en otra moneda: `changeCurrency` en la línea (pagó con dólares y se le
--        devuelve en Bs, o al revés), convertido con la tasa de la línea o la vigente;
--      * «Efectivo USD» y «Efectivo Bs» (`cash_usd`, `cash_ves`) cuentan como habilitados
--        cuando la sucursal tiene `efectivo`;
--      * el rol se lee con auth.role(): `request.jwt.claim.role` ya no viene relleno y,
--        con NULL, la comparación se saltaba la comprobación de empresa (punto 2 de la
--        auditoría del 01-10).
--   2. `cash_shifts` guarda la tasa de apertura (trigger), el fondo en Bs, la tasa de
--      cierre y el diferencial cambiario; `cash_shift_currency_counts` guarda el arqueo
--      por moneda y medio.
--   3. `cash_movements` puede guardar la moneda y el monto recibidos (gastos e ingresos
--      en Bs) con `cash_add_movement_fx_v1`.
--   4. `cash_shift_currency_summary` calcula lo esperado por moneda y medio, y
--      `cash_close_shift_currency_v1` registra el arqueo y cierra el turno con
--      `cash_close_shift` en la misma transacción.
--   5. `exchange_received_summary` resume por día lo cobrado en Bs y la tasa promedio.
--
-- ORDEN DE DESPLIEGUE: aplicar ANTES de desplegar el Panel que lo usa. Antes de aplicar,
-- comparar `settle_order_payment_v3` de la base (pg_get_functiondef) con la versión del
-- repo citada arriba: esta migración parte de ella.

-- ============================================================
-- 1. Columnas nuevas
-- ============================================================

alter table public.order_payment_lines
  add column if not exists exchange_rate_id bigint references public.exchange_rates(id),
  add column if not exists exchange_rate_source text,
  add column if not exists change_currency text,
  add column if not exists change_given_minor bigint,
  add column if not exists change_exchange_rate numeric(18, 6);

comment on column public.order_payment_lines.change_currency is
  'Moneda en que se entregó el vuelto. NULL = la misma que tendered_currency.';
comment on column public.order_payment_lines.change_given_minor is
  'Vuelto entregado, en change_currency. change_amount_minor sigue en tendered_currency.';

alter table public.cash_movements
  add column if not exists received_currency text,
  add column if not exists received_amount_minor bigint,
  add column if not exists exchange_rate numeric(18, 6),
  add column if not exists exchange_rate_id bigint references public.exchange_rates(id);

alter table public.cash_shifts
  add column if not exists opening_exchange_rate numeric(18, 6),
  add column if not exists opening_exchange_rate_id bigint references public.exchange_rates(id),
  add column if not exists exchange_rate_source text,
  add column if not exists opening_balance_ves_minor bigint not null default 0,
  add column if not exists closing_exchange_rate numeric(18, 6),
  add column if not exists closing_exchange_rate_id bigint references public.exchange_rates(id),
  add column if not exists exchange_difference_minor bigint;

comment on column public.cash_shifts.exchange_difference_minor is
  'Diferencial cambiario del turno en moneda contable: valor de los Bs cobrados a la tasa de cierre menos su valor a la tasa de cobro.';

create table if not exists public.cash_shift_currency_counts (
  id               bigint generated always as identity primary key,
  shift_id         uuid not null references public.cash_shifts(id) on delete cascade,
  company_id       uuid not null,
  bucket           text not null,
  method_id        text not null,
  rail             text not null,
  currency         text not null,
  expected_minor   bigint not null,
  counted_minor    bigint not null,
  difference_minor bigint not null,
  created_at       timestamptz not null default now(),
  constraint cash_shift_currency_counts_unique unique (shift_id, bucket)
);

alter table public.cash_shift_currency_counts enable row level security;

drop policy if exists cash_shift_currency_counts_company_read on public.cash_shift_currency_counts;
create policy cash_shift_currency_counts_company_read on public.cash_shift_currency_counts
  for select to authenticated
  using (public.is_super_admin() or company_id = public.current_user_company_id());

revoke insert, update, delete on public.cash_shift_currency_counts from anon, authenticated;
grant select on public.cash_shift_currency_counts to authenticated;

-- ============================================================
-- 2. Ayudas
-- ============================================================

-- Tasa vigente (id, valor, fuente) de la sucursal; NULL si no tiene fuente.
create or replace function public.branch_current_exchange_rate_row(p_branch_id uuid)
returns table (rate_id bigint, rate numeric, source text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.rate, b.exchange_rate_source
  from public.branches b
  join lateral (
    select er.id, er.rate
    from public.exchange_rates er
    where er.source = b.exchange_rate_source
    order by er.id desc
    limit 1
  ) r on true
  where b.id = p_branch_id
    and b.exchange_rate_source is not null;
$$;

revoke all on function public.branch_current_exchange_rate_row(uuid) from public, anon;
grant execute on function public.branch_current_exchange_rate_row(uuid) to authenticated, service_role;

-- Convierte un monto en unidades mínimas entre USD y VES con `p_rate` (Bs por 1 USD).
create or replace function public.fx_convert_minor_v1(
  p_amount_minor bigint,
  p_from text,
  p_to text,
  p_rate numeric
)
returns bigint
language plpgsql
immutable
set search_path = public
as $$
declare
  v_from text := upper(btrim(coalesce(p_from, '')));
  v_to text := upper(btrim(coalesce(p_to, '')));
  v_major numeric;
begin
  if p_amount_minor is null then return null; end if;
  if v_from = v_to then return p_amount_minor; end if;
  if p_rate is null or p_rate <= 0 then
    raise exception 'exchange_rate_required' using errcode = '22000';
  end if;
  v_major := p_amount_minor::numeric / power(10::numeric, public.order_currency_fraction_digits_v1(v_from));
  if v_from = 'USD' and v_to = 'VES' then
    v_major := v_major * p_rate;
  elsif v_from = 'VES' and v_to = 'USD' then
    v_major := v_major / p_rate;
  else
    raise exception 'unsupported_currency_pair' using errcode = '22000';
  end if;
  return round(v_major * power(10::numeric, public.order_currency_fraction_digits_v1(v_to)))::bigint;
end;
$$;

grant execute on function public.fx_convert_minor_v1(bigint, text, text, numeric) to authenticated, service_role;

-- ============================================================
-- 3. settle_order_payment_v3 con tasa validada y vuelto en otra moneda
-- ============================================================

create or replace function public.settle_order_payment_v3(
  p_order_id bigint,
  p_client_request_id uuid,
  p_payment_lines jsonb,
  p_source text default 'operator'::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_order public.orders%rowtype;
  v_user_company_id uuid;
  -- auth.role() sale del JWT de quien llama; la variable vieja ya no viene rellena.
  v_role text := coalesce(nullif(auth.role(), ''), current_setting('request.jwt.claim.role', true));
  v_shift_id uuid;
  v_currency text;
  v_scale numeric;
  v_balance_minor bigint;
  v_paid_minor bigint := 0;
  v_cash_minor bigint := 0;
  v_card_minor bigint := 0;
  v_online_minor bigint := 0;
  v_line jsonb;
  v_line_id uuid;
  v_method text;
  v_method_key text;
  v_policy jsonb;
  v_rail text;
  v_trigger text;
  v_amount bigint;
  v_settlement_amount bigint;
  v_settlement_currency text;
  v_exchange_rate numeric;
  v_expected_amount bigint;
  v_tendered_amount bigint;
  v_tendered_currency text;
  v_change_amount bigint;
  v_change_currency text;
  v_change_given bigint;
  v_change_rate numeric;
  v_enabled_methods text[];
  v_existing_result jsonb;
  v_result jsonb;
  v_existing_lines jsonb;
  v_seen_methods text[] := array[]::text[];
  v_ref_rate_id bigint;
  v_ref_rate numeric;
  v_ref_source text;
  v_line_rate_id bigint;
  v_line_rate_source text;
  v_tolerance constant numeric := 0.005;
begin
  if p_client_request_id is null then
    raise exception 'client_request_id_required' using errcode = '22000';
  end if;
  if jsonb_typeof(coalesce(p_payment_lines, 'null'::jsonb)) <> 'array' then
    raise exception 'payment_total_mismatch' using errcode = '22000';
  end if;
  if jsonb_array_length(p_payment_lines) = 0 then
    raise exception 'payment_total_mismatch' using errcode = '22000';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found_or_not_allowed' using errcode = '42501';
  end if;

  if v_role is distinct from 'service_role' then
    select u.company_id into v_user_company_id
    from public.users u
    where u.auth_user_id = auth.uid() and coalesce(u.is_active, true)
    limit 1;
    if v_user_company_id is null or v_user_company_id is distinct from v_order.company_id then
      raise exception 'order_not_found_or_not_allowed' using errcode = '42501';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_order.company_id::text || ':' || p_client_request_id::text, 0)
  );
  select result into v_existing_result
  from public.order_transaction_requests
  where company_id = v_order.company_id
    and client_request_id = p_client_request_id
    and operation = 'settle_v3';
  if found then return v_existing_result; end if;

  v_currency := upper(coalesce(nullif(btrim(v_order.currency), ''), 'CLP'));
  v_scale := power(10::numeric, public.order_currency_fraction_digits_v1(v_currency));
  select coalesce(b.payment_methods, array[]::text[])
  into v_enabled_methods
  from public.branches b
  where b.id = v_order.branch_id;
  v_balance_minor := coalesce(
    v_order.payment_balance_minor,
    v_order.total_minor,
    public.order_major_to_minor_v1(v_order.total, v_currency)
  );
  if v_balance_minor <= 0 or v_order.payment_status = 'paid' then
    raise exception 'order_already_settled' using errcode = '22000';
  end if;

  -- Tasa vigente de la sucursal (NULL fuera de Venezuela).
  select r.rate_id, r.rate, r.source
  into v_ref_rate_id, v_ref_rate, v_ref_source
  from public.branch_current_exchange_rate_row(v_order.branch_id) r;

  select cs.id into v_shift_id
  from public.cash_shifts cs
  where cs.branch_id = v_order.branch_id and cs.status = 'open'
  order by cs.opened_at desc
  limit 1
  for update;
  if v_shift_id is null then
    raise exception 'cash_shift_required' using errcode = '22000';
  end if;

  for v_line in select value from jsonb_array_elements(p_payment_lines)
  loop
    v_method := nullif(btrim(v_line ->> 'methodId'), '');
    v_method_key := public.payment_method_key_v3(v_method);
    v_policy := public.payment_method_policy_v3(
      v_order.company_id, v_method, v_currency
    );
    v_rail := v_policy ->> 'rail';
    v_trigger := v_policy ->> 'settlementTrigger';
    v_amount := (v_line ->> 'amountMinor')::bigint;
    v_settlement_amount := coalesce(
      (v_line ->> 'settlementAmountMinor')::bigint,
      v_amount
    );
    v_settlement_currency := upper(coalesce(
      v_line ->> 'settlementCurrency',
      v_currency
    ));
    v_exchange_rate := nullif(v_line ->> 'exchangeRate', '')::numeric;
    v_line_rate_id := null;
    v_line_rate_source := null;
    if v_method is null
       or v_rail not in ('cash', 'card', 'online')
       or v_amount is null
       or v_amount <= 0
       or (
         coalesce(array_length(v_enabled_methods, 1), 0) > 0
         and not exists (
           select 1
           from unnest(v_enabled_methods) enabled_method
           where public.payment_method_key_v3(enabled_method) = v_method_key
              -- Efectivo en dólares o en bolívares cuenta como «efectivo» habilitado.
              or (
                v_method_key in ('cash_usd', 'cash_ves')
                and public.payment_method_key_v3(enabled_method) = 'efectivo'
              )
         )
       )
       or upper(coalesce(v_line ->> 'currency', v_currency)) <> v_currency then
      raise exception 'invalid_payment_line' using errcode = '22000';
    end if;
    if v_method_key = any(v_seen_methods) then
      raise exception 'duplicate_payment_method' using errcode = '22000';
    end if;
    v_seen_methods := array_append(v_seen_methods, v_method_key);
    if jsonb_array_length(p_payment_lines) > 1
       and coalesce((v_policy ->> 'allowMixedPayment')::boolean, true) = false then
      raise exception 'mixed_payment_not_allowed' using errcode = '22000';
    end if;
    if v_trigger = 'gateway_webhook'
       and not (v_role = 'service_role' and p_source = 'gateway_webhook') then
      raise exception 'payment_confirmation_required' using errcode = '22000';
    end if;
    if v_settlement_currency <> v_currency then
      if v_exchange_rate is null or v_exchange_rate <= 0
         or v_settlement_amount is null or v_settlement_amount <= 0 then
        raise exception 'exchange_rate_required' using errcode = '22000';
      end if;
      -- La tasa del navegador solo vale si está cerca de la vigente de la sucursal o de
      -- la que se le cotizó al cliente al crear el pedido.
      if v_ref_rate is not null and v_settlement_currency = 'VES' and v_currency = 'USD' then
        if abs(v_exchange_rate - v_ref_rate) / v_ref_rate <= v_tolerance then
          v_line_rate_id := v_ref_rate_id;
          v_line_rate_source := v_ref_source;
        elsif v_order.quoted_exchange_rate is not null
              and abs(v_exchange_rate - v_order.quoted_exchange_rate) / v_order.quoted_exchange_rate <= v_tolerance then
          v_line_rate_id := v_order.quoted_exchange_rate_id;
          v_line_rate_source := v_order.quoted_exchange_rate_source;
        else
          raise exception 'exchange_rate_out_of_range' using errcode = '22000';
        end if;
      end if;
      v_expected_amount := round(
        (v_settlement_amount::numeric
          / power(10::numeric, public.order_currency_fraction_digits_v1(v_settlement_currency)))
        / v_exchange_rate
        * v_scale
      )::bigint;
      if abs(v_expected_amount - v_amount) > 1 then
        raise exception 'payment_conversion_mismatch' using errcode = '22000';
      end if;
    elsif v_settlement_amount <> v_amount then
      raise exception 'payment_conversion_mismatch' using errcode = '22000';
    end if;
    if (v_policy ->> 'evidencePolicy') = 'required'
       and not exists (
         select 1 from public.order_payment_evidence e
         where e.order_id = p_order_id::text
           and public.payment_method_key_v3(e.method_id) = v_method_key
           and e.status in ('uploaded', 'verified', 'pending_verification')
       ) then
      raise exception 'payment_evidence_required' using errcode = '22000';
    end if;
    v_tendered_amount := nullif(v_line ->> 'tenderedAmountMinor', '')::bigint;
    v_tendered_currency := upper(coalesce(
      nullif(v_line ->> 'tenderedCurrency', ''),
      v_settlement_currency
    ));
    v_change_amount := null;
    v_change_currency := null;
    v_change_given := null;
    v_change_rate := null;
    if v_rail = 'cash' then
      if v_tendered_amount is null
         or v_tendered_amount < v_settlement_amount
         or v_tendered_currency <> v_settlement_currency then
        raise exception 'cash_confirmation_required' using errcode = '22000';
      end if;
      v_change_amount := v_tendered_amount - v_settlement_amount;
      if nullif(v_line ->> 'changeAmountMinor', '') is not null
         and (v_line ->> 'changeAmountMinor')::bigint <> v_change_amount then
        raise exception 'cash_change_mismatch' using errcode = '22000';
      end if;

      -- Vuelto en otra moneda (pagó con dólares y se le devuelve en Bs, o al revés).
      v_change_currency := upper(coalesce(nullif(btrim(v_line ->> 'changeCurrency'), ''), v_tendered_currency));
      if v_change_currency = v_tendered_currency or v_change_amount = 0 then
        v_change_currency := v_tendered_currency;
        v_change_given := v_change_amount;
      else
        if v_currency <> 'USD'
           or v_change_currency not in ('USD', 'VES')
           or v_tendered_currency not in ('USD', 'VES') then
          raise exception 'invalid_payment_line' using errcode = '22000';
        end if;
        v_change_rate := case
          when v_settlement_currency = 'VES' then v_exchange_rate
          else v_ref_rate
        end;
        if v_change_rate is null or v_change_rate <= 0 then
          raise exception 'exchange_rate_required' using errcode = '22000';
        end if;
        v_change_given := public.fx_convert_minor_v1(
          v_change_amount, v_tendered_currency, v_change_currency, v_change_rate
        );
        if nullif(v_line ->> 'changeGivenMinor', '') is not null
           and abs((v_line ->> 'changeGivenMinor')::bigint - v_change_given) > 1 then
          raise exception 'cash_change_mismatch' using errcode = '22000';
        end if;
        if v_line_rate_id is null and v_settlement_currency <> 'VES' then
          v_line_rate_id := v_ref_rate_id;
          v_line_rate_source := v_ref_source;
        end if;
      end if;
    end if;

    v_line_id := coalesce(nullif(v_line ->> 'id', '')::uuid, gen_random_uuid());
    insert into public.order_payment_lines(
      id, order_id, client_line_id, company_id, method_id, rail, amount_minor, currency,
      settlement_amount_minor, settlement_currency, exchange_rate,
      tendered_amount_minor, tendered_currency, change_amount_minor,
      evidence_policy,
      exchange_rate_id, exchange_rate_source,
      change_currency, change_given_minor, change_exchange_rate
    ) values (
      v_line_id,
      p_order_id::text,
      coalesce(nullif(v_line ->> 'id', ''), v_line_id::text),
      v_order.company_id,
      v_method,
      v_rail,
      v_amount,
      v_currency,
      v_settlement_amount,
      v_settlement_currency,
      v_exchange_rate,
      v_tendered_amount,
      v_tendered_currency,
      v_change_amount,
      coalesce(nullif(v_line ->> 'evidencePolicy', ''), v_policy ->> 'evidencePolicy', 'none'),
      v_line_rate_id,
      v_line_rate_source,
      v_change_currency,
      v_change_given,
      v_change_rate
    )
    on conflict (id) do nothing;

    v_paid_minor := v_paid_minor + v_amount;
    if v_rail = 'cash' then v_cash_minor := v_cash_minor + v_amount;
    elsif v_rail = 'card' then v_card_minor := v_card_minor + v_amount;
    else v_online_minor := v_online_minor + v_amount;
    end if;
  end loop;

  if v_paid_minor <> v_balance_minor then
    raise exception 'payment_total_mismatch' using errcode = '22000';
  end if;

  if v_cash_minor > 0 then
    perform public.cash_add_movement(
      v_shift_id, 'sale', v_cash_minor / v_scale,
      'Cobro pedido #' || p_order_id, 'cash', p_order_id
    );
  end if;
  if v_card_minor > 0 then
    perform public.cash_add_movement(
      v_shift_id, 'sale', v_card_minor / v_scale,
      'Cobro pedido #' || p_order_id, 'card', p_order_id
    );
  end if;
  if v_online_minor > 0 then
    perform public.cash_add_movement(
      v_shift_id, 'sale', v_online_minor / v_scale,
      'Cobro pedido #' || p_order_id, 'online', p_order_id
    );
  end if;

  v_existing_lines := case
    when jsonb_typeof(v_order.payment_lines) = 'array' then v_order.payment_lines
    else '[]'::jsonb
  end;
  update public.orders
  set payment_lines = v_existing_lines || p_payment_lines,
      payment_type = case
        when (v_cash_minor > 0)::integer + (v_card_minor > 0)::integer
          + (v_online_minor > 0)::integer > 1 then 'mixto'
        when v_cash_minor > 0 then 'tienda'
        when v_card_minor > 0 then 'tarjeta'
        else 'online'
      end,
      payment_method_specific = case
        when jsonb_array_length(p_payment_lines) = 1
          then p_payment_lines -> 0 ->> 'methodId'
        else 'mixed'
      end,
      payment_breakdown = jsonb_build_object(
        'cash', v_cash_minor / v_scale,
        'card', v_card_minor / v_scale,
        'online', v_online_minor / v_scale
      ),
      payment_timing = 'immediate',
      payment_status = 'paid',
      payment_balance_minor = 0,
      updated_at = now()
  where id = p_order_id;

  select to_jsonb(o.*) into v_result
  from public.orders o where o.id = p_order_id;
  v_result := jsonb_build_object(
    'order', v_result,
    'cashRegistered', true,
    'source', p_source
  );

  insert into public.order_transaction_requests(
    company_id, client_request_id, operation, order_id, result
  ) values (
    v_order.company_id, p_client_request_id, 'settle_v3', p_order_id, v_result
  );
  return v_result;
end;
$function$;

-- ============================================================
-- 4. Turno: tasa de apertura y fondo en Bs
-- ============================================================

create or replace function public.cash_shifts_stamp_opening_rate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rate_id bigint;
  v_rate numeric;
  v_source text;
begin
  select r.rate_id, r.rate, r.source into v_rate_id, v_rate, v_source
  from public.branch_current_exchange_rate_row(new.branch_id) r;
  new.opening_exchange_rate := v_rate;
  new.opening_exchange_rate_id := v_rate_id;
  new.exchange_rate_source := v_source;
  return new;
end;
$$;

drop trigger if exists cash_shifts_stamp_opening_rate on public.cash_shifts;
create trigger cash_shifts_stamp_opening_rate
  before insert on public.cash_shifts
  for each row execute function public.cash_shifts_stamp_opening_rate();

-- Quién puede operar la caja de un turno: usuario activo de la empresa del turno con rol
-- de caja. Devuelve el turno bloqueado.
create or replace function public.cash_shift_for_operator_v1(p_shift_id uuid)
returns public.cash_shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_role text;
  v_shift public.cash_shifts;
begin
  select u.company_id, lower(btrim(u.role)) into v_company_id, v_role
  from public.users u
  where u.auth_user_id = auth.uid() and coalesce(u.is_active, true)
  limit 1;
  if v_company_id is null or v_role is null or v_role not in ('owner', 'admin', 'ceo', 'cashier') then
    raise exception 'branch_not_allowed' using errcode = '42501';
  end if;
  select * into v_shift
  from public.cash_shifts cs
  where cs.id = p_shift_id and cs.company_id = v_company_id
  for update;
  if not found then
    raise exception 'branch_not_allowed' using errcode = '42501';
  end if;
  return v_shift;
end;
$$;

revoke all on function public.cash_shift_for_operator_v1(uuid) from public, anon, authenticated;

create or replace function public.cash_set_shift_opening_ves_v1(
  p_shift_id uuid,
  p_opening_ves_minor bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.cash_shifts;
  v_result jsonb;
begin
  if p_opening_ves_minor is null or p_opening_ves_minor < 0 then
    raise exception 'invalid_opening_amount' using errcode = '22000';
  end if;
  v_shift := public.cash_shift_for_operator_v1(p_shift_id);
  if v_shift.status is distinct from 'open' then
    raise exception 'cash_shift_not_open';
  end if;
  update public.cash_shifts
  set opening_balance_ves_minor = p_opening_ves_minor
  where id = p_shift_id
  returning to_jsonb(cash_shifts) into v_result;
  return v_result;
end;
$$;

revoke all on function public.cash_set_shift_opening_ves_v1(uuid, bigint) from public, anon;
grant execute on function public.cash_set_shift_opening_ves_v1(uuid, bigint) to authenticated;

-- ============================================================
-- 5. Movimientos manuales en otra moneda (gastos, ingresos, retiros en Bs)
-- ============================================================

-- `p_received_minor` está en `p_received_currency`. El movimiento se registra en la
-- moneda contable con la tasa vigente de la sucursal; la moneda recibida queda guardada
-- para el arqueo por moneda.
create or replace function public.cash_add_movement_fx_v1(
  p_shift_id uuid,
  p_type text,
  p_description text,
  p_payment_method text,
  p_received_currency text,
  p_received_minor bigint,
  p_expense_kind text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.cash_shifts;
  v_currency text;
  v_received text := upper(btrim(coalesce(p_received_currency, '')));
  v_rate_id bigint;
  v_rate numeric;
  v_accounting_minor bigint;
  v_inserted jsonb;
  v_id text;
begin
  if p_received_minor is null or p_received_minor <= 0 then
    raise exception 'invalid_amount' using errcode = '22000';
  end if;
  if coalesce(p_type, '') not in ('income', 'expense') then
    raise exception 'invalid_cash_movements' using errcode = '22000';
  end if;
  v_shift := public.cash_shift_for_operator_v1(p_shift_id);
  if v_shift.status is distinct from 'open' then
    raise exception 'cash_shift_not_open';
  end if;

  v_currency := upper(coalesce(nullif(btrim(v_shift.currency), ''), 'USD'));
  if v_received = '' then v_received := v_currency; end if;

  if v_received <> v_currency then
    select r.rate_id, r.rate into v_rate_id, v_rate
    from public.branch_current_exchange_rate_row(v_shift.branch_id) r;
    if v_rate is null then
      raise exception 'exchange_rate_required' using errcode = '22000';
    end if;
  end if;
  v_accounting_minor := public.fx_convert_minor_v1(p_received_minor, v_received, v_currency, v_rate);
  if v_accounting_minor <= 0 then
    raise exception 'invalid_amount' using errcode = '22000';
  end if;

  -- Nombres de parámetro igual que cashService.addMovement del Panel.
  if p_expense_kind is null then
    v_inserted := to_jsonb(public.cash_add_movement(
      p_shift_id => p_shift_id,
      p_type => p_type,
      p_amount => v_accounting_minor::numeric / power(10::numeric, public.order_currency_fraction_digits_v1(v_currency)),
      p_description => p_description,
      p_payment_method => coalesce(p_payment_method, 'cash'),
      p_order_id => null
    ));
  else
    v_inserted := to_jsonb(public.cash_add_movement(
      p_shift_id => p_shift_id,
      p_type => p_type,
      p_amount => v_accounting_minor::numeric / power(10::numeric, public.order_currency_fraction_digits_v1(v_currency)),
      p_description => p_description,
      p_payment_method => coalesce(p_payment_method, 'cash'),
      p_order_id => null,
      p_expense_kind => p_expense_kind
    ));
  end if;
  v_id := v_inserted ->> 'id';
  if v_id is null then
    raise exception 'cash_movement_insert_failed';
  end if;

  update public.cash_movements cm
  set amount_minor = v_accounting_minor,
      currency = v_currency,
      received_currency = v_received,
      received_amount_minor = p_received_minor,
      exchange_rate = v_rate,
      exchange_rate_id = v_rate_id
  where cm.id::text = v_id
  returning to_jsonb(cm) into v_inserted;
  return v_inserted;
end;
$$;

revoke all on function public.cash_add_movement_fx_v1(uuid, text, text, text, text, bigint, text) from public, anon;
grant execute on function public.cash_add_movement_fx_v1(uuid, text, text, text, text, bigint, text) to authenticated;

-- ============================================================
-- 6. Lo esperado por moneda y medio en un turno
-- ============================================================

-- Cajones (bucket):
--   cash:USD, cash:VES                 efectivo físico por moneda
--   <method_id>:<moneda>               cada medio no efectivo (pago móvil en Bs, Zelle en USD, punto en Bs…)
--   card:<moneda>, online:<moneda>     cobros sin libro de pagos (pedidos antiguos), en moneda contable
--
-- Fuentes:
--   * order_payment_lines del turno (sucursal del turno, creadas entre la apertura y el
--     cierre): el efectivo suma lo recibido en su moneda y resta el vuelto en la moneda
--     en que se dio; los demás medios suman lo cobrado en su moneda.
--   * order_payment_refunds del turno: restan del medio de su línea, en la moneda de la línea.
--   * cash_movements del turno que no son de un pedido con libro de pagos: en la moneda
--     recibida si la guardaron (gastos en Bs), si no en moneda contable.
--   * fondo inicial: opening_balance en moneda contable y opening_balance_ves_minor en Bs.
create or replace function public.cash_shift_currency_summary_rows_v1(p_shift public.cash_shifts)
returns table (
  bucket text,
  method_id text,
  rail text,
  currency text,
  expected_minor bigint,
  accounting_minor bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with shift as (
    select
      p_shift.id as shift_id,
      p_shift.branch_id,
      p_shift.opened_at,
      coalesce(p_shift.closed_at, now()) as until_at,
      upper(coalesce(nullif(btrim(p_shift.currency), ''), 'USD')) as currency
  ),
  lines as (
    select l.*
    from public.order_payment_lines l
    join public.orders o on o.id::text = l.order_id
    cross join shift s
    where o.branch_id::text = s.branch_id::text
      and l.created_at >= s.opened_at
      and l.created_at <= s.until_at
  ),
  ledger_orders as (
    select distinct l.order_id from lines l
  ),
  entries as (
    -- Efectivo recibido, en la moneda en que se entregó.
    select 'cash:' || upper(coalesce(l.tendered_currency, l.settlement_currency, l.currency)) as bucket,
           'cash' as method_id, 'cash' as rail,
           upper(coalesce(l.tendered_currency, l.settlement_currency, l.currency)) as currency,
           coalesce(l.tendered_amount_minor, l.settlement_amount_minor, l.amount_minor) as amount,
           l.exchange_rate as fx_rate,
           false as is_opening
    from lines l where l.rail = 'cash'
    union all
    -- Vuelto entregado, en la moneda en que se dio.
    select 'cash:' || upper(coalesce(l.change_currency, l.tendered_currency, l.settlement_currency, l.currency)),
           'cash', 'cash',
           upper(coalesce(l.change_currency, l.tendered_currency, l.settlement_currency, l.currency)),
           -coalesce(l.change_given_minor, l.change_amount_minor, 0),
           coalesce(l.change_exchange_rate, l.exchange_rate),
           false
    from lines l where l.rail = 'cash' and coalesce(l.change_given_minor, l.change_amount_minor, 0) > 0
    union all
    -- Medios no efectivo
    select lower(l.method_id) || ':' || upper(coalesce(l.settlement_currency, l.currency)),
           lower(l.method_id), l.rail,
           upper(coalesce(l.settlement_currency, l.currency)),
           coalesce(l.settlement_amount_minor, l.amount_minor),
           l.exchange_rate,
           false
    from lines l where l.rail <> 'cash'
    union all
    -- Devoluciones de líneas del libro (salen por el medio y en la moneda de la línea)
    select case when l.rail = 'cash'
                then 'cash:' || upper(coalesce(l.settlement_currency, l.currency))
                else lower(l.method_id) || ':' || upper(coalesce(l.settlement_currency, l.currency)) end,
           case when l.rail = 'cash' then 'cash' else lower(l.method_id) end,
           l.rail,
           upper(coalesce(l.settlement_currency, l.currency)),
           -case when upper(coalesce(l.settlement_currency, l.currency)) = upper(l.currency)
                 then r.amount_minor
                 else public.fx_convert_minor_v1(r.amount_minor, l.currency, l.settlement_currency, l.exchange_rate) end,
           l.exchange_rate,
           false
    from public.order_payment_refunds r
    join lines l on l.id::text = r.payment_line_id::text
    cross join shift s
    where r.created_at >= s.opened_at and r.created_at <= s.until_at
    union all
    -- Movimientos sin libro de pagos (pedidos antiguos y movimientos manuales)
    select case when cm.payment_method = 'cash'
                then 'cash:' || upper(coalesce(cm.received_currency, cm.currency, s.currency))
                else cm.payment_method || ':' || upper(coalesce(cm.received_currency, cm.currency, s.currency)) end,
           cm.payment_method,
           cm.payment_method,
           upper(coalesce(cm.received_currency, cm.currency, s.currency)),
           (case when cm.type in ('sale', 'income') then 1 else -1 end)
             * coalesce(
                 cm.received_amount_minor,
                 cm.amount_minor,
                 round(coalesce(cm.amount, 0) * power(10::numeric, public.order_currency_fraction_digits_v1(s.currency)))::bigint
               ),
           cm.exchange_rate,
           false
    from public.cash_movements cm
    cross join shift s
    where cm.shift_id = s.shift_id
      and cm.type in ('sale', 'income', 'expense')
      and cm.payment_method in ('cash', 'card', 'online')
      and (cm.order_id is null or cm.order_id::text not in (select order_id from ledger_orders))
    union all
    -- Fondo inicial (no es venta: no suma a lo contabilizado)
    select 'cash:' || s.currency, 'cash', 'cash', s.currency,
           round(coalesce(p_shift.opening_balance, 0) * power(10::numeric, public.order_currency_fraction_digits_v1(s.currency)))::bigint,
           null::numeric,
           true
    from shift s
    union all
    select 'cash:VES', 'cash', 'cash', 'VES', p_shift.opening_balance_ves_minor, null::numeric, true
    from shift s
    where coalesce(p_shift.opening_balance_ves_minor, 0) > 0
  )
  -- expected_minor: lo que debería haber en el cajón, en su moneda.
  -- accounting_minor: lo que esos movimientos valen en moneda contable a la tasa con que
  -- se cobraron (sin el fondo inicial); sirve para el diferencial cambiario.
  select e.bucket, min(e.method_id), min(e.rail), min(e.currency),
         sum(e.amount)::bigint,
         sum(case
               when e.is_opening then 0
               when e.currency = (select currency from shift) then e.amount
               when e.fx_rate is null or e.fx_rate <= 0 then 0
               else public.fx_convert_minor_v1(e.amount, e.currency, (select currency from shift), e.fx_rate)
             end)::bigint
  from entries e
  group by e.bucket
  order by case when e.bucket like 'cash:%' then 0 else 1 end, e.bucket;
$$;

revoke all on function public.cash_shift_currency_summary_rows_v1(public.cash_shifts) from public, anon, authenticated;

create or replace function public.cash_shift_currency_summary(p_shift_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_shift public.cash_shifts;
  v_rate_id bigint;
  v_rate numeric;
  v_source text;
  v_rows jsonb;
  v_counts jsonb;
begin
  select u.company_id into v_company_id
  from public.users u
  where u.auth_user_id = auth.uid() and coalesce(u.is_active, true)
  limit 1;

  select * into v_shift
  from public.cash_shifts cs
  where cs.id = p_shift_id
    and (cs.company_id = v_company_id or public.is_super_admin());
  if not found then
    raise exception 'branch_not_allowed' using errcode = '42501';
  end if;

  select r.rate_id, r.rate, r.source into v_rate_id, v_rate, v_source
  from public.branch_current_exchange_rate_row(v_shift.branch_id) r;

  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) into v_rows
  from public.cash_shift_currency_summary_rows_v1(v_shift) x;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.id), '[]'::jsonb) into v_counts
  from public.cash_shift_currency_counts c
  where c.shift_id = p_shift_id;

  return jsonb_build_object(
    'shiftId', v_shift.id,
    'status', v_shift.status,
    'currency', upper(coalesce(nullif(btrim(v_shift.currency), ''), 'USD')),
    'buckets', v_rows,
    'counts', v_counts,
    'openingRate', v_shift.opening_exchange_rate,
    'closingRate', v_shift.closing_exchange_rate,
    'exchangeRateSource', coalesce(v_shift.exchange_rate_source, v_source),
    'currentRate', v_rate,
    'currentRateId', v_rate_id,
    'exchangeDifferenceMinor', v_shift.exchange_difference_minor
  );
end;
$$;

revoke all on function public.cash_shift_currency_summary(uuid) from public, anon;
grant execute on function public.cash_shift_currency_summary(uuid) to authenticated;

-- ============================================================
-- 7. Cierre con arqueo por moneda
-- ============================================================

-- `p_counts`: [{ "bucket": "cash:VES", "countedMinor": 123456 }, …] con lo contado en cada
-- cajón, en su moneda. Guarda el arqueo, la tasa de cierre y el diferencial, y cierra el
-- turno con `cash_close_shift` (montos en moneda contable, a la tasa de cierre) en la
-- misma transacción.
create or replace function public.cash_close_shift_currency_v1(
  p_shift_id uuid,
  p_counts jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shift public.cash_shifts;
  v_currency text;
  v_digits int;
  v_rate_id bigint;
  v_rate numeric;
  v_row record;
  v_counted bigint;
  v_counted_accounting bigint;
  v_actual_cash bigint := 0;
  v_actual_card bigint := 0;
  v_actual_online bigint := 0;
  v_ves_expected bigint := 0;
  v_ves_booked bigint := 0;
  v_difference bigint := null;
begin
  if jsonb_typeof(coalesce(p_counts, 'null'::jsonb)) <> 'array' then
    raise exception 'invalid_close_amounts' using errcode = '22000';
  end if;

  v_shift := public.cash_shift_for_operator_v1(p_shift_id);
  if v_shift.status is distinct from 'open' then
    raise exception 'cash_shift_not_open';
  end if;

  v_currency := upper(coalesce(nullif(btrim(v_shift.currency), ''), 'USD'));
  v_digits := public.order_currency_fraction_digits_v1(v_currency);

  select r.rate_id, r.rate into v_rate_id, v_rate
  from public.branch_current_exchange_rate_row(v_shift.branch_id) r;

  delete from public.cash_shift_currency_counts where shift_id = p_shift_id;

  for v_row in select * from public.cash_shift_currency_summary_rows_v1(v_shift)
  loop
    select nullif(c ->> 'countedMinor', '')::bigint into v_counted
    from jsonb_array_elements(p_counts) c
    where c ->> 'bucket' = v_row.bucket
    limit 1;
    if v_counted is null then
      v_counted := v_row.expected_minor;
    end if;
    if v_counted < 0 then
      raise exception 'invalid_close_amounts' using errcode = '22000';
    end if;

    insert into public.cash_shift_currency_counts
      (shift_id, company_id, bucket, method_id, rail, currency, expected_minor, counted_minor, difference_minor)
    values
      (p_shift_id, v_shift.company_id, v_row.bucket, v_row.method_id, v_row.rail, v_row.currency,
       v_row.expected_minor, v_counted, v_counted - v_row.expected_minor);

    if v_row.currency = v_currency then
      v_counted_accounting := v_counted;
    elsif v_rate is not null then
      v_counted_accounting := public.fx_convert_minor_v1(v_counted, v_row.currency, v_currency, v_rate);
    else
      raise exception 'exchange_rate_required' using errcode = '22000';
    end if;

    if v_row.rail = 'cash' then
      v_actual_cash := v_actual_cash + v_counted_accounting;
    elsif v_row.rail = 'card' then
      v_actual_card := v_actual_card + v_counted_accounting;
    else
      v_actual_online := v_actual_online + v_counted_accounting;
    end if;

    if v_row.currency = 'VES' and v_currency = 'USD' then
      v_ves_expected := v_ves_expected + v_row.expected_minor;
      v_ves_booked := v_ves_booked + v_row.accounting_minor;
    end if;
  end loop;

  -- Diferencial: lo que valen hoy los Bs cobrados (a la tasa de cierre) menos lo que se
  -- contabilizó al cobrarlos. El fondo inicial en Bs no se contabilizó en dólares, así que
  -- se descuenta.
  if v_rate is not null and v_currency = 'USD' then
    v_difference := public.fx_convert_minor_v1(
      v_ves_expected - coalesce(v_shift.opening_balance_ves_minor, 0), 'VES', 'USD', v_rate
    ) - v_ves_booked;
  end if;

  update public.cash_shifts
  set closing_exchange_rate = v_rate,
      closing_exchange_rate_id = v_rate_id,
      exchange_difference_minor = v_difference
  where id = p_shift_id;

  return public.cash_close_shift(
    p_shift_id,
    v_actual_cash::numeric / power(10::numeric, v_digits),
    v_actual_card::numeric / power(10::numeric, v_digits),
    v_actual_online::numeric / power(10::numeric, v_digits)
  );
end;
$$;

revoke all on function public.cash_close_shift_currency_v1(uuid, jsonb) from public, anon;
grant execute on function public.cash_close_shift_currency_v1(uuid, jsonb) to authenticated;

-- ============================================================
-- 8. Reporte: lo cobrado en Bs por día
-- ============================================================

create or replace function public.exchange_received_summary(
  p_branch_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_time_zone text default 'America/Caracas'
)
returns table (
  day date,
  payments integer,
  accounting_minor bigint,
  ves_minor bigint,
  weighted_rate numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select u.company_id into v_company_id
  from public.users u
  where u.auth_user_id = auth.uid() and coalesce(u.is_active, true)
  limit 1;

  if not public.is_super_admin() and not exists (
    select 1 from public.branches b where b.id = p_branch_id and b.company_id = v_company_id
  ) then
    raise exception 'branch_not_allowed' using errcode = '42501';
  end if;

  return query
  select (l.created_at at time zone coalesce(p_time_zone, 'America/Caracas'))::date as day,
         count(*)::integer,
         sum(l.amount_minor)::bigint,
         sum(l.settlement_amount_minor)::bigint,
         case when sum(l.amount_minor) > 0
              then round(
                (sum(l.settlement_amount_minor)::numeric / 100) / (sum(l.amount_minor)::numeric / 100), 4)
              else null end
  from public.order_payment_lines l
  join public.orders o on o.id::text = l.order_id
  where o.branch_id::text = p_branch_id::text
    and upper(coalesce(l.settlement_currency, '')) = 'VES'
    and l.created_at >= p_from
    and l.created_at < p_to
  group by 1
  order by 1;
end;
$$;

revoke all on function public.exchange_received_summary(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.exchange_received_summary(uuid, timestamptz, timestamptz, text) to authenticated;
