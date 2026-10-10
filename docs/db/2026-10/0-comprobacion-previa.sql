-- Comprobación previa (solo lectura). Correr ANTES del SQL de hoy y con el mismo usuario que
-- lo va a correr (postgres en el SQL editor). Todo debería decir «sí». Un «NO» trae el detalle.
with
col as (
  -- pg_attribute y no information_schema: esta solo muestra columnas sobre las que se tiene permiso.
  select c.relname::text as tabla, a.attname::text as columna, format_type(a.atttypid, a.atttypmod) as tipo
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v') and a.attnum > 0 and not a.attisdropped
),
fn as (
  select p.oid, p.proname::text as nombre, p.prosrc, p.proowner, p.prosecdef,
         p.proargnames, p.pronargs, p.pronargdefaults
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
tbl as (
  select c.oid, c.relname::text as nombre, c.relowner, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
),
rol as (
  select (select oid from pg_roles where rolname = 'anon') as anon,
         (select oid from pg_roles where rolname = 'authenticated') as autenticado
),
-- create_order_transaction con la firma que parcha 20261010 (la de 20260918/20260919).
coa as (
  select f.* from fn f
  where f.oid = to_regprocedure('public.create_order_transaction(text,text,text,jsonb,numeric,text,text,text,uuid,uuid,text,text,text,jsonb,numeric,text,text,jsonb,uuid)')
),
need (grupo, tabla, columna) as (
  values
    -- Lo que lee o toca el SQL de hoy (20261007 y 20261010).
    ('sql', 'branches', 'company_id'), ('sql', 'branches', 'country'),
    ('sql', 'companies', 'country'), ('sql', 'companies', 'subscription_status'),
    ('sql', 'companies', 'subscription_ends_at'), ('sql', 'companies', 'theme_config'),
    ('sql', 'orders', 'id'), ('sql', 'orders', 'branch_id'), ('sql', 'orders', 'client_request_id'),
    ('sql', 'users', 'auth_user_id'), ('sql', 'users', 'company_id'), ('sql', 'users', 'role'),
    ('sql', 'users', 'is_active'),
    -- select de branches del menú público, /cuenta y súper admin (sin binance_pay ni exchange_rate_source: los agrega el SQL de hoy).
    ('sucursales', 'branches', 'id'), ('sucursales', 'branches', 'name'), ('sucursales', 'branches', 'slug'),
    ('sucursales', 'branches', 'address'), ('sucursales', 'branches', 'phone'), ('sucursales', 'branches', 'instagram'),
    ('sucursales', 'branches', 'whatsapp_url'), ('sucursales', 'branches', 'instagram_url'), ('sucursales', 'branches', 'map_url'),
    ('sucursales', 'branches', 'schedule'), ('sucursales', 'branches', 'is_active'), ('sucursales', 'branches', 'payment_methods'),
    ('sucursales', 'branches', 'pago_movil'), ('sucursales', 'branches', 'zelle'), ('sucursales', 'branches', 'transferencia_bancaria'),
    ('sucursales', 'branches', 'stripe'), ('sucursales', 'branches', 'mercadopago'), ('sucursales', 'branches', 'paypal'),
    ('sucursales', 'branches', 'efectivo'), ('sucursales', 'branches', 'tarjeta'), ('sucursales', 'branches', 'delivery_settings'),
    ('sucursales', 'branches', 'origin_lat'), ('sucursales', 'branches', 'origin_lng'), ('sucursales', 'branches', 'order_intake_paused'),
    ('sucursales', 'branches', 'order_intake_pause_message'), ('sucursales', 'branches', 'order_intake_paused_at'),
    ('sucursales', 'branches', 'order_intake_paused_by'), ('sucursales', 'branches', 'currency'), ('sucursales', 'branches', 'created_at'),
    -- companies en páginas públicas (getCachedCompany), /cuenta y alta.
    ('empresas', 'companies', 'id'), ('empresas', 'companies', 'name'), ('empresas', 'companies', 'email'),
    ('empresas', 'companies', 'phone'), ('empresas', 'companies', 'address'), ('empresas', 'companies', 'legal_rut'),
    ('empresas', 'companies', 'public_slug'), ('empresas', 'companies', 'custom_domain'), ('empresas', 'companies', 'plan_id'),
    ('empresas', 'companies', 'integration_settings'), ('empresas', 'companies', 'currency'), ('empresas', 'companies', 'created_by'),
    ('empresas', 'companies', 'created_at'), ('empresas', 'companies', 'updated_at'),
    ('promo', 'companies', 'first_payment_promo_used_at'),
    -- onboarding_applications en el alta (apply, complete, checkout, «Crear mi tienda», cierre del pago).
    ('alta', 'onboarding_applications', 'id'), ('alta', 'onboarding_applications', 'email'),
    ('alta', 'onboarding_applications', 'business_name'), ('alta', 'onboarding_applications', 'responsible_name'),
    ('alta', 'onboarding_applications', 'phone'), ('alta', 'onboarding_applications', 'sector'),
    ('alta', 'onboarding_applications', 'plan_id'), ('alta', 'onboarding_applications', 'custom_plan_name'),
    ('alta', 'onboarding_applications', 'country'), ('alta', 'onboarding_applications', 'currency'),
    ('alta', 'onboarding_applications', 'status'), ('alta', 'onboarding_applications', 'payment_status'),
    ('alta', 'onboarding_applications', 'payment_reference'), ('alta', 'onboarding_applications', 'payment_reference_url'),
    ('alta', 'onboarding_applications', 'payment_amount'), ('alta', 'onboarding_applications', 'payment_months'),
    ('alta', 'onboarding_applications', 'subscription_payment_method'), ('alta', 'onboarding_applications', 'company_id'),
    ('alta', 'onboarding_applications', 'verification_token'), ('alta', 'onboarding_applications', 'welcome_email_sent_at'),
    ('alta', 'onboarding_applications', 'logo_url'), ('alta', 'onboarding_applications', 'social_instagram'),
    ('alta', 'onboarding_applications', 'fiscal_address'), ('alta', 'onboarding_applications', 'billing_rut'),
    ('alta', 'onboarding_applications', 'created_at'), ('alta', 'onboarding_applications', 'updated_at'),
    ('cupones', 'onboarding_applications', 'coupon_id'), ('cupones', 'onboarding_applications', 'coupon_code'),
    ('cupones', 'onboarding_applications', 'coupon_discount_usd'), ('cupones', 'onboarding_applications', 'coupon_free_months'),
    ('cupones', 'onboarding_applications', 'coupon_keeps_promo'),
    ('cuenta_cupon', 'discount_coupons', 'restricted_account_id'),
    ('usuarios', 'users', 'id'), ('usuarios', 'users', 'email'), ('usuarios', 'users', 'role'),
    ('usuarios', 'users', 'company_id'), ('usuarios', 'users', 'branch_id'), ('usuarios', 'users', 'full_name'),
    ('usuarios', 'users', 'auth_user_id'), ('usuarios', 'users', 'auth_id'), ('usuarios', 'users', 'is_active'),
    ('horario', 'branches', 'business_hours')
),
faltan as (
  select n.grupo, string_agg(n.tabla || '.' || n.columna, ', ' order by n.tabla, n.columna) as detalle
  from need n
  where not exists (select 1 from col c where c.tabla = n.tabla and c.columna = n.columna)
  group by n.grupo
)
select comprobacion, case when problema is null then 'sí' else 'NO: ' || problema end as resultado
from (values
  -- A. Lo que necesita el SQL de hoy para no detenerse a medias.
  ('A1 Roles anon, authenticated y service_role',
    case when (select count(*) from pg_roles where rolname in ('anon', 'authenticated', 'service_role')) = 3
      then null else 'falta algún rol (los grants de 20261007/20261010 fallan)' end),
  ('A2 Tablas branches, companies, orders, onboarding_applications, users',
    (select string_agg(x, ', ') from unnest(array['branches', 'companies', 'orders', 'onboarding_applications', 'users']) as x
     where to_regclass('public.' || x) is null)),
  ('A3 branches.id y companies.id son uuid (claves foráneas de 20261007)',
    (select string_agg(tabla || '.id es ' || tipo, ', ') from col where columna = 'id' and tabla in ('branches', 'companies') and tipo <> 'uuid')),
  ('A4 Columnas que lee el SQL de hoy', (select detalle from faltan where grupo = 'sql')),
  ('A5 is_super_admin() → boolean, current_user_company_id() → uuid (policy de 20261007), auth.uid() y auth.role() (parche de 20261010)',
    case when (select prorettype from pg_proc where oid = to_regprocedure('public.is_super_admin()')) = 'boolean'::regtype
          and (select prorettype from pg_proc where oid = to_regprocedure('public.current_user_company_id()')) = 'uuid'::regtype
          and to_regprocedure('auth.uid()') is not null
          and to_regprocedure('auth.role()') is not null
      then null else 'falta alguna, tiene otros argumentos o devuelve otro tipo' end),
  ('A6 create_order_transaction con la firma de 19 parámetros (20260918/20260919)',
    case when exists (select 1 from coa) then null else 'no existe con esa firma: el bloque DO de 20261010 se detiene' end),
  ('A7 create_order_transaction tiene el punto donde 20261010 inserta el control (o ya lo tiene)',
    case when exists (select 1 from coa
                      where position('assert_store_open_for_orders' in prosrc) > 0
                         or position(('if v_company_id is null then raise exception ''company_not_found'' using errcode = ''P0001''' || chr(59) || ' end if' || chr(59)) in prosrc) > 0)
      then null else 'su código cambió: el bloque DO de 20261010 se detiene' end),
  ('A8 create_order_transaction es SECURITY DEFINER',
    case when exists (select 1 from coa where prosecdef)
      then null else 'no lo es: tras 20261010 los pedidos del menú fallarían por permiso sobre assert_store_open_for_orders' end),
  ('A9 Una sola versión de create_order_transaction y de create_public_order_v1',
    case when (select count(*) from fn where nombre = 'create_order_transaction') = 1
          and (select count(*) from fn where nombre = 'create_public_order_v1') <= 1
      then null else 'hay sobrecargas: las llamadas por nombre quedan ambiguas' end),
  ('A10 create_public_order_v1 (si existe) con la firma de 20261001',
    case when not exists (
        select 1 from fn where nombre = 'create_public_order_v1'
          and (pg_get_function_identity_arguments(oid) <> 'p_client_request_id uuid, p_client_name text, p_client_phone text, p_client_rut text, p_items jsonb, p_total numeric, p_payment_type text, p_payment_ref text, p_note text, p_branch_id uuid, p_company_id uuid, p_status text, p_payment_method_specific text, p_order_type text, p_delivery_address jsonb, p_delivery_fee numeric, p_coupon_code text, p_order_origin text'
               or pg_get_function_result(oid) <> 'jsonb'))
      then null else 'firma o nombres distintos: el create or replace de 20261010 falla o crea otra versión' end),
  ('A11 Sin restos incompatibles de una corrida anterior de 20261007',
    case when (to_regclass('public.exchange_rates') is null
               or (select count(*) from col where tabla = 'exchange_rates'
                   and columna in ('id', 'source', 'rate', 'published_at', 'fetched_at', 'checked_at')) = 6)
          and (to_regclass('public.branch_exchange_rate_source_changes') is null
               or (select count(*) from col where tabla = 'branch_exchange_rate_source_changes'
                   and columna in ('id', 'company_id', 'branch_id', 'old_source', 'new_source', 'changed_by', 'changed_at')) = 7)
      then null else 'exchange_rates o branch_exchange_rate_source_changes ya existen con otras columnas' end),
  ('A12 Permisos de quien corre el SQL (alter table, triggers, create or replace)',
    'sin permiso sobre: ' || (select string_agg(x, ', ') from (
        select t.nombre as x from tbl t
        where t.nombre in ('branches', 'orders', 'onboarding_applications') and not pg_has_role(current_user, t.relowner, 'USAGE')
        union all
        select t.nombre || ' (references)' from tbl t
        where t.nombre in ('branches', 'companies') and not has_table_privilege(t.oid, 'REFERENCES')
        union all
        select f.nombre || '()' from fn f
        where f.nombre in ('create_order_transaction', 'create_public_order_v1') and not pg_has_role(current_user, f.proowner, 'USAGE')
        union all
        select 'esquema public (create)' where not has_schema_privilege('public', 'CREATE')
      ) s)),

  -- B. Migraciones anteriores que el código nuevo usa.
  ('B1 companies.first_payment_promo_used_at (20250626)', (select detalle from faltan where grupo = 'promo')),
  ('B2 Bucket menu público (20260720): logos, fondos y fotos van con URL pública',
    case when exists (select 1 from storage.buckets where id = 'menu' and public = true) then null else 'no existe o no es público' end),
  ('B3 Bucket receipts privado (20261002)',
    case when exists (select 1 from storage.buckets where id = 'receipts' and public = false) then null else 'no existe o es público' end),
  ('B4 menu_client_accounts y menu_client_link_requests (20260902)',
    (select string_agg(x, ', ') from unnest(array['menu_client_accounts', 'menu_client_link_requests']) as x
     where to_regclass('public.' || x) is null)),
  ('B5 discount_coupons.restricted_account_id (20260918)', (select detalle from faltan where grupo = 'cuenta_cupon')),
  ('B6 create_order_transaction de 20260919 (pedidos de cuentas del menú)',
    case when exists (select 1 from coa where position('account_order_requires_session' in prosrc) > 0)
      then null else 'falta 20260919_account_orders_from_account.sql' end),
  ('B7 email_deliveries (20260924)',
    case when to_regclass('public.email_deliveries') is not null then null else 'falta la tabla' end),
  ('B8 Horario 20260930: columna, funciones y control dentro de create_order_transaction',
    coalesce((select detalle from faltan where grupo = 'horario'),
      case when to_regprocedure('public.assert_branch_accepting_menu_orders(uuid)') is not null
            and to_regprocedure('public.branch_business_hours_open(jsonb,timestamp with time zone)') is not null
            and exists (select 1 from coa where position('assert_branch_accepting_menu_orders' in prosrc) > 0)
        then null else 'faltan sus funciones o el control dentro de create_order_transaction' end)),
  ('B9 Tamaños y variantes (20261001/20261005), también en validate_and_normalize_order_items',
    coalesce((select string_agg(x, ', ') from unnest(array['product_sizes', 'product_variants']) as x
              where to_regclass('public.' || x) is null),
      case when exists (select 1 from fn where nombre = 'validate_and_normalize_order_items' and position('product_variants' in prosrc) > 0)
        then null else 'validate_and_normalize_order_items es anterior a 20261005' end)),
  -- Con estas el Panel CEO guarda tamaños y variantes: sin ellas, «Varios tamaños» no se guarda.
  -- Las dos primeras las crean 20261001/20261005 (firma exacta); las otras tres viven solo en la
  -- base y se buscan por nombre.
  ('B9b Funciones del Panel para guardar tamaños y variantes (y las que usan por dentro)',
    nullif(concat_ws(', ',
      (select string_agg(x, ', ') from unnest(array[
          'public.admin_set_product_sizes(uuid,uuid,jsonb,boolean)',
          'public.admin_set_product_variants(uuid,uuid,jsonb,boolean)']) as x
       where to_regprocedure(x) is null
          or not has_function_privilege((select autenticado from rol), to_regprocedure(x), 'EXECUTE')),
      (select string_agg(x, ', ') from unnest(array['is_valid_uuid', 'current_user_company_id', 'is_super_admin']) as x
       where not exists (select 1 from fn where nombre = x))), '')),
  ('B10 Cupones de suscripción completos (20261006)',
    coalesce((select detalle from faltan where grupo = 'cupones'),
      (select string_agg(x, ', ') from unnest(array['subscription_coupons', 'subscription_coupon_redemptions']) as x
       where to_regclass('public.' || x) is null),
      case when exists (select 1 from fn where nombre = 'redeem_subscription_coupon') then null else 'falta redeem_subscription_coupon' end)),
  ('B11 plan_payment_methods y plan_payment_method_config',
    (select string_agg(x, ', ') from unnest(array['plan_payment_methods', 'plan_payment_method_config']) as x
     where to_regclass('public.' || x) is null)),
  ('B12 Columnas de branches del menú, /cuenta y súper admin', (select detalle from faltan where grupo = 'sucursales')),
  ('B13 Columnas de companies de las páginas públicas y del alta', (select detalle from faltan where grupo = 'empresas')),
  ('B14 Columnas de onboarding_applications del alta', (select detalle from faltan where grupo = 'alta')),
  ('B15 Columnas de users que crea «Crear mi tienda»', (select detalle from faltan where grupo = 'usuarios')),
  ('B16 Tablas del Panel que usan la carga del menú y el borrado de vistas previas',
    (select string_agg(x, ', ') from unnest(array['categories', 'products', 'category_branch', 'product_branch', 'product_prices',
       'product_extras_groups', 'product_extras_options', 'product_upsell_beverages', 'product_inventory_recipe', 'hero_banners',
       'company_theme_drafts', 'company_theme_versions', 'business_info', 'clients', 'client_addresses', 'payment_methods',
       'payments_history', 'cash_shifts']) as x
     where to_regclass('public.' || x) is null)),

  -- C. RPC que viven solo en la base (Panel): que existan, que el rol pueda llamarlas y con los parámetros que manda el código.
  ('C1 admin_create_category_with_overrides (authenticated: p_name, p_branch_id, p_order, p_is_active)',
    case when exists (select 1 from fn f, rol
        where f.nombre = 'admin_create_category_with_overrides'
          and has_function_privilege(rol.autenticado, f.oid, 'EXECUTE')
          and f.proargnames @> array['p_name', 'p_branch_id', 'p_order', 'p_is_active']
          and coalesce(f.proargnames[1:(f.pronargs - f.pronargdefaults)], '{}') <@ array['p_name', 'p_branch_id', 'p_order', 'p_is_active'])
      then null else 'no existe, authenticated no la puede ejecutar o cambiaron sus parámetros' end),
  ('C2 admin_upsert_product_with_branch (authenticated: 12 parámetros de create-menu-items.ts)',
    case when exists (select 1 from fn f, rol
        where f.nombre = 'admin_upsert_product_with_branch'
          and has_function_privilege(rol.autenticado, f.oid, 'EXECUTE')
          and f.proargnames @> array['p_product_id', 'p_name', 'p_description', 'p_image_url', 'p_category_id', 'p_branch_id',
                                     'p_price', 'p_has_discount', 'p_discount_price', 'p_is_active', 'p_is_special', 'p_apply_to_all_branches']
          and coalesce(f.proargnames[1:(f.pronargs - f.pronargdefaults)], '{}') <@ array['p_product_id', 'p_name', 'p_description',
                'p_image_url', 'p_category_id', 'p_branch_id', 'p_price', 'p_has_discount', 'p_discount_price', 'p_is_active',
                'p_is_special', 'p_apply_to_all_branches'])
      then null else 'no existe, authenticated no la puede ejecutar o cambiaron sus parámetros' end),
  ('C3 admin_delete_product_with_branch (authenticated: p_product_id)',
    case when exists (select 1 from fn f, rol
        where f.nombre = 'admin_delete_product_with_branch'
          and has_function_privilege(rol.autenticado, f.oid, 'EXECUTE')
          and f.proargnames @> array['p_product_id']
          and coalesce(f.proargnames[1:(f.pronargs - f.pronargdefaults)], '{}') <@ array['p_product_id'])
      then null else 'no existe, authenticated no la puede ejecutar o cambiaron sus parámetros' end),
  ('C4 get_public_menu ejecutable con la clave anónima (menú público)',
    case when exists (select 1 from fn f, rol where f.nombre = 'get_public_menu' and has_function_privilege(rol.anon, f.oid, 'EXECUTE'))
      then null else 'el menú público no la puede llamar' end),

  -- D. Lecturas con la clave anónima.
  ('D1 anon lee plans (grant y policy): menú, home y sitemap leen plans(features) con la clave anónima',
    case when exists (select 1 from tbl t, rol
        where t.nombre = 'plans'
          and has_table_privilege(rol.anon, t.oid, 'SELECT')
          and (not t.relrowsecurity or exists (
            select 1 from pg_policies po
            where po.schemaname = 'public' and po.tablename = 'plans'
              and po.cmd in ('SELECT', 'ALL') and po.permissive = 'PERMISSIVE'
              and po.roles && array['anon', 'public']::name[])))
      then null else 'sin features, «solo panel CEO» tendría menú público y «solo menú» saldría cerrado' end),
  ('D2 anon tiene SELECT de tabla en branches (si son grants por columna, binance_pay necesita el suyo)',
    case when exists (select 1 from tbl t, rol where t.nombre = 'branches' and has_table_privilege(rol.anon, t.oid, 'SELECT'))
      then null else 'agrega «grant select (binance_pay) on public.branches to anon, authenticated» al SQL' end),

  -- E. Valores nuevos que el código escribe.
  ('E1 Ningún CHECK que enumera métodos de pago deja fuera binance_pay',
    (select 'CHECK sin binance_pay: ' || string_agg(k.conrelid::regclass::text || '.' || k.conname, ', ')
     from pg_constraint k
     where k.contype = 'c' and k.connamespace = 'public'::regnamespace
       and pg_get_constraintdef(k.oid) ilike '%zelle%'
       and pg_get_constraintdef(k.oid) not ilike '%binance_pay%')),
  ('E2 Ningún CHECK de onboarding_applications o payments_history deja fuera mercadopago',
    (select 'CHECK sin mercadopago: ' || string_agg(k.conrelid::regclass::text || '.' || k.conname, ', ')
     from pg_constraint k
     where k.contype = 'c'
       and k.conrelid in (select oid from tbl where nombre in ('onboarding_applications', 'payments_history'))
       and pg_get_constraintdef(k.oid) ilike '%paypal%'
       and pg_get_constraintdef(k.oid) not ilike '%mercadopago%'))
) as t(comprobacion, problema);
