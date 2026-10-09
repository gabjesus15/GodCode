-- Tanda 1 de 3: columnas nuevas (Binance Pay en sucursales y dos del alta). Va antes de desplegar.
--
-- Correr entero en el SQL editor de Supabase (pega todo y ejecuta). Va en una sola transacción:
-- si algo falla, no se aplica nada de esta tanda y el error dice dónde. Se puede volver a correr.
-- Antes: docs/db/2026-10/0-comprobacion-previa.sql con todo en «sí». Guía: docs/db/2026-10/LEEME.md.

begin;

-- Si alguna tabla está ocupada más de 5 segundos (pedidos entrando), se cancela en vez de dejar
-- el menú y la caja esperando. En ese caso, vuelve a correrla en un momento más tranquilo.
set local lock_timeout = '5s';


-- ============================================================
-- migrations/20261009_binance_pay.sql
-- ============================================================

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

-- ============================================================
-- migrations/20261010_onboarding_legal_version.sql
-- ============================================================

-- Versión de los Términos y la Política de privacidad que aceptó cada solicitud del alta.
--
-- Qué hace: agrega `onboarding_applications.legal_version` (texto corto, opcional).
--
-- Por qué: el formulario guardaba `terms_accepted` / `privacy_accepted` como booleanos, sin
-- decir qué versión de los textos vio la persona. Al cambiar los documentos no había forma
-- de saber a quién pedirle que acepte los nuevos. El paso 1 manda ahora
-- `LEGAL_DOCUMENTS_VERSION` (lib/legal/legal-documents.ts) y el servicio de alta la guarda
-- aquí. Las solicitudes anteriores quedan en null (aceptaron una versión anterior a este
-- registro).
--
-- Se puede correr antes o después del deploy: si la columna todavía no existe, el alta
-- reintenta el insert sin ella y deja `onboarding_legal_version_column_missing` en el log.
--
-- Idempotente: `add column if not exists`.

alter table public.onboarding_applications
  add column if not exists legal_version text;

comment on column public.onboarding_applications.legal_version is
  'Versión de Términos y Privacidad aceptada en el paso 1 del alta (LEGAL_DOCUMENTS_VERSION). Null en solicitudes anteriores.';

-- ============================================================
-- migrations/20261010_onboarding_reconcile_alerted_at.sql
-- ============================================================

-- Barrido de altas a medias (lib/onboarding/reconcile.ts): un aviso por fila y por día.
--
-- Qué hace: agrega `onboarding_applications.reconcile_alerted_at`, cuándo se avisó por
-- última vez al equipo (Telegram) de esa solicitud trabada. Null: nunca se avisó.
--
-- Por qué: el barrido corre cada hora y avisaba de las mismas altas trabadas en cada
-- corrida, sin tope. Con la columna, el aviso de una misma solicitud se repite como mucho
-- una vez cada 24 horas. El barrido la escribe sin tocar `updated_at` (de esa fecha dependen
-- sus ventanas de búsqueda).
--
-- Se puede correr antes o después del deploy: sin la columna el barrido sigue funcionando y
-- avisa en cada corrida, como antes (deja `reconcile_alerted_at_missing` en el log).
--
-- Idempotente: `add column if not exists`.

alter table public.onboarding_applications
  add column if not exists reconcile_alerted_at timestamptz;

comment on column public.onboarding_applications.reconcile_alerted_at is
  'Último aviso por Telegram del barrido de altas a medias (reconcile): como mucho uno cada 24 horas por solicitud.';

-- PostgREST (la API de Supabase) recarga el esquema para ver las columnas y funciones nuevas.
notify pgrst, 'reload schema';

commit;
