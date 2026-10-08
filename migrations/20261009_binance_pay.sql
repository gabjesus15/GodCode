-- Binance Pay como método de pago de sucursal.
--
-- El cliente paga en USDT por Binance Pay y sube el comprobante, como con Zelle. El USDT se
-- toma 1 a 1 con el dólar: la línea de cobro se liquida en USD y no usa tasa de cambio.
--
-- Qué cambia:
--   1. `branches.binance_pay`: datos públicos que ve el cliente (Pay ID, correo y nombre),
--      en el mismo formato JSON que `zelle` o `pago_movil`.
--   2. `payment_method_policy_v3`: `binance_pay` exige comprobante y se liquida en USD
--      aunque la empresa no tenga fila en `payment_methods`. Parte de la versión de
--      GodCode-Panel/supabase/migrations/20260821_canonicalize_efectivo_payment_method.sql;
--      solo cambian las dos listas marcadas.
--
-- Antes de aplicar, comparar `payment_method_policy_v3` de la base (pg_get_functiondef)
-- con esa versión.

alter table public.branches
  add column if not exists binance_pay text;

comment on column public.branches.binance_pay is
  'Datos públicos de Binance Pay (JSON: pay_id, email, name). Los lee el menú con la clave anónima.';

create or replace function public.payment_method_policy_v3(
  p_company_id uuid,
  p_method_id text,
  p_accounting_currency text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_method text := public.payment_method_key_v3(p_method_id);
  v_row public.payment_methods%rowtype;
  v_rail text;
  v_evidence text;
  v_trigger text;
  v_currency text;
begin
  select * into v_row
  from public.payment_methods pm
  where pm.company_id = p_company_id
    and public.payment_method_key_v3(pm.method_name) = v_method
    and pm.is_active
  limit 1;

  v_rail := coalesce(v_row.rail, case
    when v_method in ('efectivo', 'cash_usd', 'cash_ves') then 'cash'
    when v_method in ('card', 'stripe', 'mercadopago') then 'card'
    else 'online'
  end);
  v_evidence := case
    when v_row.id is not null and v_row.requires_receipt then 'required'
    -- Cambio: binance_pay
    when v_method in ('pago_movil', 'zelle', 'binance_pay', 'paypal', 'bank_transfer') then 'required'
    else 'none'
  end;
  v_trigger := coalesce(v_row.settlement_trigger, case
    when v_rail = 'cash' then 'cash_confirmation'
    when v_method = 'card' then 'pos_confirmation'
    when v_method in ('stripe', 'mercadopago') then 'gateway_webhook'
    when v_evidence = 'required' then 'evidence_uploaded'
    else 'manual_verification'
  end);
  v_currency := upper(coalesce(
    nullif(v_row.settlement_currency, ''),
    case when v_method = 'pago_movil' then 'VES'
         -- Cambio: binance_pay (USDT 1 a 1 con el dólar)
         when v_method in ('zelle', 'binance_pay') then 'USD'
         else p_accounting_currency end
  ));

  return jsonb_build_object(
    'id', v_method,
    'rail', v_rail,
    'evidencePolicy', v_evidence,
    'settlementTrigger', v_trigger,
    'settlementCurrency', v_currency,
    'allowMixedPayment', coalesce(v_row.allow_mixed_payment, true)
  );
end;
$function$;
