-- Comprobación posterior (solo lectura). Correr después de las tandas 1, 2 y 3.
-- Todo debería decir «sí». Si algo dice «NO», no despliegues y avisa al equipo con el resultado.
with
col as (
  select c.relname::text as tabla, a.attname::text as columna
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and a.attnum > 0 and not a.attisdropped
),
fn as (
  select p.proname::text as nombre, p.prosrc
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select comprobacion, case when ok then 'sí' else 'NO' end as resultado
from (values
  -- Tanda 1
  ('1. Columna branches.binance_pay',
    exists (select 1 from col where tabla = 'branches' and columna = 'binance_pay')),
  ('1. El menú (clave anónima) puede leer branches.binance_pay',
    has_column_privilege('anon', 'public.branches', 'binance_pay', 'SELECT')),
  ('1. Columna onboarding_applications.legal_version',
    exists (select 1 from col where tabla = 'onboarding_applications' and columna = 'legal_version')),
  ('1. Columna onboarding_applications.reconcile_alerted_at',
    exists (select 1 from col where tabla = 'onboarding_applications' and columna = 'reconcile_alerted_at')),
  -- Tanda 2
  ('2. Tabla exchange_rates, legible por el menú',
    to_regclass('public.exchange_rates') is not null
      and has_table_privilege('anon', 'public.exchange_rates', 'SELECT')),
  ('2. Tabla branch_exchange_rate_source_changes',
    to_regclass('public.branch_exchange_rate_source_changes') is not null),
  ('2. Columna branches.exchange_rate_source',
    exists (select 1 from col where tabla = 'branches' and columna = 'exchange_rate_source')),
  ('2. Columnas orders.quoted_exchange_rate*',
    exists (select 1 from col where tabla = 'orders' and columna = 'quoted_exchange_rate')),
  ('2. Funciones record_exchange_rate, branch_exchange_rate y set_branch_exchange_rate_source',
    (select count(distinct nombre) from fn
     where nombre in ('record_exchange_rate', 'branch_exchange_rate', 'set_branch_exchange_rate_source')) = 3),
  ('2. Trigger: sucursales de Venezuela nuevas arrancan con el dólar BCV',
    exists (select 1 from pg_trigger where tgname = 'branches_default_exchange_rate_source' and not tgisinternal)),
  ('2. Trigger: cada pedido guarda la tasa con que se cotizó',
    exists (select 1 from pg_trigger where tgname = 'orders_set_quoted_exchange_rate' and not tgisinternal)),
  ('2. Toda sucursal de Venezuela tiene fuente de tasa',
    not exists (
      select 1 from public.branches b left join public.companies c on c.id = b.company_id
      where b.exchange_rate_source is null
        and (upper(btrim(coalesce(b.country, ''))) in ('VE', 'VENEZUELA')
             or upper(btrim(coalesce(c.country, ''))) in ('VE', 'VENEZUELA')))),
  -- Tanda 3
  ('3. Función assert_store_open_for_orders',
    exists (select 1 from fn where nombre = 'assert_store_open_for_orders')),
  ('3. create_public_order_v1 comprueba que la tienda esté abierta',
    exists (select 1 from fn where nombre = 'create_public_order_v1' and prosrc like '%assert_store_open_for_orders%')),
  ('3. create_order_transaction comprueba que la tienda esté abierta',
    exists (select 1 from fn where nombre = 'create_order_transaction' and prosrc like '%assert_store_open_for_orders%')),
  ('3. create_order_transaction deja vender a la caja del propio negocio',
    exists (select 1 from fn where nombre = 'create_order_transaction' and prosrc like '%u.company_id = v_company_id%')),
  ('3. create_order_transaction conserva el control de horario',
    exists (select 1 from fn where nombre = 'create_order_transaction' and prosrc like '%assert_branch_accepting_menu_orders%'))
) as t(comprobacion, ok);
