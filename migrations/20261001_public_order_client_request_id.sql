-- Pedido del menú público: queda atado a un client_request_id que solo conoce
-- quien lo creó.
--
-- POST /api/tenant/public-order-delivery cierra el pedido recién creado (envío,
-- dirección, código de entrega) sin autenticación. Hasta ahora lo buscaba solo por
-- id, y los id son correlativos: dentro de la ventana de 10 minutos cualquiera podía
-- reescribir la dirección de un pedido ajeno, llevarse su handoff_code o
-- cancelarlo mandando datos inválidos.
--
-- create_order_transaction no guarda client_request_id (solo lo hace
-- create_manual_order_atomic_v1 en caja). Esta envoltura crea el pedido igual que
-- antes y le fija el uuid que generó el navegador; la ruta exige ese uuid.
--
-- SECURITY DEFINER no cambia lo que create_order_transaction valida: sus chequeos
-- usan auth.role() y auth.uid(), que salen del JWT de quien llama, no del rol de
-- Postgres.
--
-- Aplicar ANTES del deploy del Portal que la usa: el menú nuevo llama a esta
-- función y sin ella no puede crear pedidos. El menú viejo sigue funcionando con
-- la migración aplicada porque no la llama.

begin;

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
begin
  if p_client_request_id is null then
    raise exception 'client_request_id_required' using errcode = '22000';
  end if;

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
    p_company_id => p_company_id,
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

commit;
