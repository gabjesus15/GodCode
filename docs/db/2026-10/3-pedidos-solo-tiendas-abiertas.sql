-- Tanda 3 de 3: pedidos del menú solo a tiendas abiertas al público.
--
-- Correr entero en el SQL editor de Supabase (pega todo y ejecuta). Va en una sola transacción:
-- si algo falla, no se aplica nada de esta tanda y el error dice dónde. Se puede volver a correr.
-- Antes: docs/db/2026-10/0-comprobacion-previa.sql con todo en «sí». Guía: docs/db/2026-10/LEEME.md.

begin;

-- Si alguna tabla está ocupada más de 5 segundos (pedidos entrando), se cancela en vez de dejar
-- el menú y la caja esperando. En ese caso, vuelve a correrla en un momento más tranquilo.
set local lock_timeout = '5s';


-- ============================================================
-- migrations/20261010_public_order_requires_open_store.sql
-- ============================================================

-- Pedidos del menú solo a tiendas abiertas al público.
--
-- Qué hace:
--   1. Crea `assert_store_open_for_orders(p_branch_id)`: lanza `store_not_open` (errcode
--      42501) si la tienda de esa sucursal no está abierta al público.
--   2. Redefine `create_public_order_v1` (la que llama el carrito anónimo con la clave anon)
--      para comprobarlo antes de delegar.
--   3. Inserta la misma comprobación en la definición viva de `create_order_transaction`.
--
-- Por qué: «Arma y paga» crea la tienda en vista previa (`companies.subscription_status =
-- 'trial'` sin vencimiento y `theme_config->'storeDraft'` sin `openedAt`). Las páginas
-- públicas la esconden, pero ni `create_public_order_v1` ni `create_order_transaction`
-- miraban esa marca: con el id de una sucursal cualquiera se podían crear pedidos en una
-- tienda que todavía no se pagó, o en una suspendida o vencida. `create_order_transaction`
-- también se puede llamar directo con la clave anon (el menú viejo lo hacía y este repo no
-- le quita ese permiso), así que la comprobación va en las dos. Las rutas del servidor
-- (precios, catálogo, políticas de pago y cierre del envío) repiten la regla; la barrera
-- real es esta.
--
-- La regla es la misma que `resolveTenantPublicView(...) === 'open'`
-- (lib/plans/tenant-subscription.ts y lib/tenant/store-draft.ts):
--   - suspendida, vencida (`subscription_ends_at <= now()`) o cancelada sin fecha: cerrada;
--   - vista previa sin abrir (`storeDraft.since` presente, sin `openedAt`) mientras siga en
--     `trial`: cerrada;
--   - el resto (active, trial normal, cancelada con tiempo pagado, payment_pending): abierta.
-- No se limita a `subscription_status in ('active','trial')`: `payment_pending` (renovación
-- por transferencia en revisión) y una cancelación con tiempo pagado siguen abiertas en la
-- app, y cerrarlas solo aquí dejaría un menú visible que no puede recibir pedidos.
--
-- La tienda se toma siempre de la sucursal. `create_order_transaction` confía en
-- `p_company_id` si llega: en `create_public_order_v1`, si llegan las dos y no coinciden, se
-- rechaza (`branch_company_mismatch`); el carrito manda la empresa de la misma sucursal.
--
-- En `create_order_transaction` la comprobación se salta solo para el personal del propio
-- negocio (`users.auth_user_id = auth.uid()` de esa empresa): la caja del Panel crea pedidos
-- manuales por ahí y hoy no mira la suscripción, así que cortarla aquí la dejaría sin vender en
-- pleno servicio el día que vence el plan, con un error crudo. Bloquear también la caja con el
-- plan vencido es otra decisión, y si se toma va con su mensaje en el Panel. El servidor
-- (service role, sin `auth.uid()`) sí pasa por la comprobación: la ruta de pedidos de las
-- cuentas del menú (`app/api/menu-account/order`) llama a esta función con service role.
--
-- Correr DESPUÉS de migrations/20261001_public_order_client_request_id.sql y de
-- 20260930_branch_business_hours.sql. Idempotente: `create or replace` y el parche de
-- `create_order_transaction` no se repite si ya está. No cambia firmas: el menú ya
-- desplegado sigue funcionando y recibe `store_not_open` en una tienda que no vende.

create or replace function public.assert_store_open_for_orders(p_branch_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
  v_status text;
  v_ends_at timestamptz;
  v_draft jsonb;
  v_draft_since boolean;
  v_draft_opened boolean;
begin
  select b.company_id into v_company_id from public.branches b where b.id = p_branch_id;
  if v_company_id is null then
    raise exception 'store_not_open' using errcode = '42501';
  end if;

  select c.subscription_status, c.subscription_ends_at, c.theme_config -> 'storeDraft'
    into v_status, v_ends_at, v_draft
  from public.companies c
  where c.id = v_company_id;
  if not found then
    raise exception 'store_not_open' using errcode = '42501';
  end if;

  v_status := lower(btrim(coalesce(v_status, '')));

  -- Igual que isTenantSubscriptionAccessible.
  if v_status = 'suspended'
     or (v_ends_at is not null and v_ends_at <= now())
     or (v_status = 'cancelled' and v_ends_at is null) then
    raise exception 'store_not_open' using errcode = '42501';
  end if;

  -- Igual que readStoreDraft + isStoreDraftPending: `since` y `openedAt` cuentan solo si
  -- son texto no vacío (sobre un null o un escalar, `->` da null y queda en false).
  v_draft_since := coalesce(
    jsonb_typeof(v_draft -> 'since') = 'string' and btrim(v_draft ->> 'since') <> '',
    false
  );
  v_draft_opened := coalesce(
    jsonb_typeof(v_draft -> 'openedAt') = 'string' and btrim(v_draft ->> 'openedAt') <> '',
    false
  );
  if v_draft_since and not v_draft_opened and v_status = 'trial' then
    raise exception 'store_not_open' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.assert_store_open_for_orders(uuid) from public, anon, authenticated;

create or replace function public.create_public_order_v1(
  p_client_request_id uuid,
  p_client_name text,
  p_client_phone text,
  p_client_rut text,
  p_items jsonb,
  p_total numeric,
  p_payment_type text,
  p_payment_ref text,
  p_note text,
  p_branch_id uuid,
  p_company_id uuid,
  p_status text,
  p_payment_method_specific text default null,
  p_order_type text default 'pickup',
  p_delivery_address jsonb default null,
  p_delivery_fee numeric default 0,
  p_coupon_code text default null,
  p_order_origin text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_order jsonb;
  v_company_id uuid;
begin
  if p_client_request_id is null then
    raise exception 'client_request_id_required' using errcode = '22000';
  end if;
  if p_branch_id is null then
    raise exception 'branch_required' using errcode = '22000';
  end if;

  -- La tienda del pedido es la de la sucursal: el carrito no puede elegir otra.
  select b.company_id into v_company_id from public.branches b where b.id = p_branch_id;
  if p_company_id is not null and v_company_id is not null and p_company_id is distinct from v_company_id then
    raise exception 'branch_company_mismatch' using errcode = '42501';
  end if;
  perform public.assert_store_open_for_orders(p_branch_id);

  v_order := public.create_order_transaction(
    p_client_name => p_client_name,
    p_client_phone => p_client_phone,
    p_client_rut => p_client_rut,
    p_items => p_items,
    p_total => p_total,
    p_payment_type => p_payment_type,
    p_payment_ref => p_payment_ref,
    p_note => p_note,
    p_branch_id => p_branch_id,
    p_company_id => v_company_id,
    p_status => p_status,
    p_payment_method_specific => p_payment_method_specific,
    p_order_type => p_order_type,
    p_delivery_address => p_delivery_address,
    p_delivery_fee => p_delivery_fee,
    p_coupon_code => p_coupon_code,
    p_order_origin => p_order_origin
  );

  update public.orders
  set client_request_id = p_client_request_id
  where id = (v_order ->> 'id')::bigint;

  return v_order || jsonb_build_object('client_request_id', p_client_request_id);
end;
$function$;

revoke all on function public.create_public_order_v1(
  uuid, text, text, text, jsonb, numeric, text, text, text, uuid, uuid, text, text, text, jsonb, numeric, text, text
) from public;
grant execute on function public.create_public_order_v1(
  uuid, text, text, text, jsonb, numeric, text, text, text, uuid, uuid, text, text, text, jsonb, numeric, text, text
) to anon, authenticated, service_role;

-- Inserta la comprobación en la definición viva de create_order_transaction (como hizo
-- 20260930_branch_business_hours.sql con el horario) en vez de copiarla entera: así no se
-- pisa ningún cambio hecho después en el repo del Panel. Va justo después de resolver la
-- empresa; mira la tienda de la sucursal. Si la función cambió y no se encuentra dónde
-- insertarla, la migración se detiene con el motivo: no queda a medias sin avisar.
do $$
declare
  v_fn regprocedure := 'public.create_order_transaction(text,text,text,jsonb,numeric,text,text,text,uuid,uuid,text,text,text,jsonb,numeric,text,text,jsonb,uuid)'::regprocedure;
  v_anchor constant text := $a$if v_company_id is null then raise exception 'company_not_found' using errcode = 'P0001'; end if;$a$;
  v_def text;
begin
  v_def := pg_get_functiondef(v_fn);
  if position('assert_store_open_for_orders' in v_def) > 0 then
    return;
  end if;
  if position(v_anchor in v_def) = 0 then
    raise exception 'create_order_transaction cambió: no se encontró dónde insertar la comprobación de tienda abierta';
  end if;
  v_def := replace(
    v_def,
    v_anchor,
    v_anchor || $p$

  -- Tienda abierta al público: ni vista previa sin pagar, ni suspendida o vencida. No aplica
  -- al personal del propio negocio (la caja): ver la cabecera de
  -- 20261010_public_order_requires_open_store.sql.
  if not exists (
       select 1 from public.users u
       where u.auth_user_id = auth.uid()
         and u.company_id = v_company_id
         and coalesce(u.is_active, true)
     ) then
    perform public.assert_store_open_for_orders(p_branch_id);
  end if;$p$
  );
  execute v_def;
end;
$$;

-- PostgREST (la API de Supabase) recarga el esquema para ver las columnas y funciones nuevas.
notify pgrst, 'reload schema';

commit;
