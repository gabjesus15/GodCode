-- Binance Pay como método de pago de sucursal: la columna con los datos públicos.
--
-- El cliente paga en USDT por Binance Pay y sube el comprobante, como con Zelle. El USDT se
-- toma 1 a 1 con el dólar.
--
-- Qué cambia: `branches.binance_pay`, los datos públicos que ve el cliente (Pay ID, correo y
-- nombre), en el mismo formato JSON que `zelle` o `pago_movil`. El menú público la lee con la
-- clave anónima, así que esta columna tiene que existir ANTES de desplegar la app: si falta,
-- el select de sucursales del menú falla.
--
-- La política de cobro de Binance Pay en la caja (`payment_method_policy_v3`) es del Panel y
-- vive en migrations/panel/20261009_payment_method_policy_v3_binance_pay.sql.

alter table public.branches
  add column if not exists binance_pay text;

comment on column public.branches.binance_pay is
  'Datos públicos de Binance Pay (JSON: pay_id, email, name). Los lee el menú con la clave anónima.';

-- Si `anon` lee `branches` con permisos por columna, también necesita esta. Con el permiso
-- de tabla habitual de Supabase no cambia nada.
grant select (binance_pay) on public.branches to anon, authenticated;
