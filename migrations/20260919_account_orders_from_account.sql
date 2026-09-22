-- Pedidos de clientes con cuenta del menú: el contacto sale de la cuenta.
--
-- Hasta ahora create_order_transaction confiaba en lo que mandaba el navegador:
-- con el uuid de la ficha de una cuenta, el menú anónimo podía colgarle pedidos
-- y reescribir su nombre, teléfono y documento. Y cada pedido copiaba esos datos
-- en claro a orders, client_addresses y discount_coupon_redemptions.
--
-- Ahora, cuando el pedido va a la ficha de una cuenta (menu_client_accounts):
-- - solo lo crea el Portal con la sesión de la cuenta (service_role) o el
--   personal de ese negocio; el resto recibe account_order_requires_session;
-- - nombre, teléfono y documento se copian de la ficha (el Portal la guarda con
--   nombre corto y datos cifrados), no de los parámetros;
-- - la ficha no se reescribe y no se guarda la dirección en claro;
-- - la búsqueda por teléfono de un comprador rápido ya no cae en una cuenta.
-- update_order_transaction (y update_order_v3, que la llama) conserva el contacto
-- y la dirección cifrada del pedido de una cuenta.
--
-- Aplicar junto con el deploy del Portal que crea esos pedidos en el servidor
-- (POST /api/menu-account/order): antes de eso el menú con sesión los crea desde
-- el navegador y quedaría rechazado.

begin;

CREATE OR REPLACE FUNCTION public.create_order_transaction(p_client_name text, p_client_phone text, p_client_rut text, p_items jsonb, p_total numeric, p_payment_type text, p_payment_ref text, p_note text, p_branch_id uuid, p_company_id uuid, p_status text, p_payment_method_specific text DEFAULT NULL::text, p_order_type text DEFAULT 'pickup'::text, p_delivery_address jsonb DEFAULT NULL::jsonb, p_delivery_fee numeric DEFAULT 0, p_coupon_code text DEFAULT NULL::text, p_order_origin text DEFAULT NULL::text, p_payment_breakdown jsonb DEFAULT NULL::jsonb, p_client_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_client_id uuid;
  v_new_order jsonb;
  v_existing_client_id uuid;
  v_company_id uuid;
  v_canonical_phone text;
  v_phone_normalized text;
  v_normalized jsonb;
  v_items jsonb;
  v_subtotal numeric;
  v_net numeric;
  v_tax_total numeric := 0;
  v_final_total numeric;
  v_delivery_fee numeric := 0;
  v_row_delivery_address jsonb;
  v_row_delivery_fee numeric := 0;
  v_fulfillment text;
  v_channel text;
  v_sequence_group text;
  v_base_offset int;
  v_business_day date;
  v_daily_count int;
  v_handoff text;
  i int;
  v_discount_amount numeric := 0;
  v_coupon_id uuid;
  v_coupon_result jsonb;
  v_order_id bigint;
  v_shift_id uuid;
  v_shift_sequence int;
  v_payment_breakdown jsonb;
  v_user_role text;
  v_delivery_km numeric;
  v_tax_rate numeric;
  v_tax_included boolean;
  v_currency text;
  v_payment_type text;
  v_is_account boolean := false;
  v_row_client_name text;
  v_row_client_phone text;
  v_row_client_rut text;
begin
  if p_branch_id is null then raise exception 'branch_required' using errcode = '22000'; end if;
  if p_items is null or jsonb_array_length(p_items) is null then raise exception 'items_required' using errcode = '22000'; end if;

  if p_company_id is null then
    select company_id into v_company_id from public.branches where id = p_branch_id;
  else
    v_company_id := p_company_id;
  end if;
  if v_company_id is null then raise exception 'company_not_found' using errcode = 'P0001'; end if;

  select t.tax_rate, t.tax_included, t.currency into v_tax_rate, v_tax_included, v_currency
  from public.resolve_branch_tax_settings(p_branch_id) t;

  v_canonical_phone := public.format_cl_phone_display(p_client_phone);
  v_phone_normalized := public.normalize_cl_phone_digits(p_client_phone);

  select lower(btrim(u.role)) into v_user_role
  from public.users u
  where u.auth_user_id = auth.uid() and coalesce(u.is_active, true) = true
  limit 1;

  v_normalized := public.validate_and_normalize_order_items(p_branch_id, p_items);
  v_items := v_normalized -> 'items';
  v_subtotal := (v_normalized ->> 'subtotal')::numeric;

  v_fulfillment := lower(btrim(coalesce(nullif(btrim(p_order_type), ''), 'pickup')));
  if v_fulfillment in ('envio', 'envío', 'despacho') then v_fulfillment := 'delivery'; end if;
  if v_fulfillment not in ('delivery', 'salon', 'mesa') then v_fulfillment := 'pickup'; end if;

  if p_order_origin is not null and lower(btrim(p_order_origin)) in ('web', 'online', 'menu') then
    v_channel := 'online';
  elsif v_fulfillment = 'delivery' then
    v_channel := 'delivery';
  elsif v_fulfillment in ('salon', 'mesa') then
    v_channel := 'salon';
  else
    v_channel := 'pickup';
  end if;

  if p_client_id is not null then
    select id into v_existing_client_id from public.clients where id = p_client_id and company_id = v_company_id limit 1;
    if v_existing_client_id is null then raise exception 'client_not_found_or_not_allowed' using errcode = '22000'; end if;
  elsif v_phone_normalized <> '' then
    -- La ficha de una cuenta del menú nunca se adivina por teléfono: cualquiera
    -- puede escribir en el carrito el teléfono de otra persona.
    select c.id into v_existing_client_id
    from public.clients c
    where c.company_id = v_company_id and c.phone_normalized = v_phone_normalized
      and not exists (select 1 from public.menu_client_accounts a where a.client_id = c.id)
    order by coalesce(c.last_order_at, c.created_at) desc nulls last
    limit 1;
  end if;

  -- Pedido de un cliente con cuenta del menú. Solo lo crea el Portal con la sesión
  -- de la cuenta (service_role) o el personal del negocio; el menú anónimo no puede
  -- colgarle pedidos a una cuenta ajena. El contacto sale de la ficha de la cuenta
  -- (cifrado por el Portal), nunca de lo que mandó el navegador.
  v_is_account := p_client_id is not null and exists (
    select 1 from public.menu_client_accounts a
    where a.client_id = v_existing_client_id and a.company_id = v_company_id
  );
  if v_is_account then
    if coalesce(auth.role(), '') <> 'service_role'
       and public.current_user_company_id() is distinct from v_company_id then
      raise exception 'account_order_requires_session' using errcode = '42501';
    end if;
    select c.name, c.phone, c.rut into v_row_client_name, v_row_client_phone, v_row_client_rut
    from public.clients c where c.id = v_existing_client_id;
  else
    v_row_client_name := p_client_name;
    v_row_client_phone := v_canonical_phone;
    v_row_client_rut := p_client_rut;
  end if;

  if v_fulfillment = 'delivery' then
    if p_delivery_address is null or p_delivery_address = 'null'::jsonb then raise exception 'delivery_address_required' using errcode = '22000'; end if;
    v_delivery_fee := public.resolve_delivery_fee_for_role(v_user_role, p_branch_id, p_delivery_address, v_subtotal, p_delivery_fee, null);
    v_handoff := null;
    for i in 1..20 loop
      v_handoff := lpad((floor(random() * 900000) + 100000)::text, 6, '0');
      exit when not exists (select 1 from public.orders o where o.handoff_code is not null and o.handoff_code = v_handoff);
    end loop;
    if exists (select 1 from public.orders o where o.handoff_code is not null and o.handoff_code = v_handoff) then raise exception 'handoff_code_collision' using errcode = '22000'; end if;
    v_row_delivery_address := p_delivery_address;
    v_row_delivery_fee := v_delivery_fee;
  else
    v_delivery_fee := 0;
    v_handoff := null;
    v_row_delivery_address := null;
    v_row_delivery_fee := 0;
  end if;

  v_coupon_result := public.compute_order_coupon_discount(v_company_id, p_coupon_code, v_subtotal, v_canonical_phone, null, p_client_id);
  v_discount_amount := coalesce((v_coupon_result ->> 'discount_amount')::numeric, 0);
  v_coupon_id := (v_coupon_result ->> 'coupon_id')::uuid;

  v_net := round(greatest(0::numeric, v_subtotal - v_discount_amount), 2);
  v_tax_total := public.compute_order_tax(v_net, v_tax_rate, v_tax_included);
  if coalesce(v_tax_included, true) then
    v_final_total := v_net + v_delivery_fee;
  else
    v_final_total := v_net + v_tax_total + v_delivery_fee;
  end if;
  v_final_total := round(v_final_total, 2);

  if abs(coalesce(p_total, 0) - v_final_total) > 1 then raise exception 'invalid_item_price' using errcode = '22000'; end if;

  v_payment_type := lower(btrim(coalesce(p_payment_type, '')));
  if v_payment_type = 'pendiente' then
    v_payment_breakdown := null;
  else
    v_payment_breakdown := public.normalize_payment_breakdown_for_total(p_payment_breakdown, v_final_total);
    if v_payment_breakdown is null and v_final_total > 0 and v_payment_type <> '' then
      -- Compat: un solo método sin desglose explícito se asume al total.
      if v_payment_type in ('tarjeta', 'card') then
        v_payment_breakdown := jsonb_build_object('cash', 0, 'card', v_final_total, 'online', 0);
      elsif v_payment_type in ('online', 'transferencia') then
        v_payment_breakdown := jsonb_build_object('cash', 0, 'card', 0, 'online', v_final_total);
      else
        v_payment_breakdown := jsonb_build_object('cash', v_final_total, 'card', 0, 'online', 0);
      end if;
    end if;
  end if;

  if v_existing_client_id is not null then
    update public.clients
    set name = case when v_is_account then name else coalesce(p_client_name, name) end,
        phone = case when v_is_account then phone else coalesce(v_canonical_phone, phone) end,
        phone_normalized = case when v_is_account then phone_normalized else coalesce(nullif(v_phone_normalized, ''), phone_normalized) end,
        rut = case when v_is_account then rut when length(p_client_rut) > 6 then p_client_rut else rut end,
        total_spent = coalesce(total_spent, 0) + v_final_total,
        total_orders = coalesce(total_orders, 0) + 1,
        last_order_at = now(),
        updated_at = now()
    where id = v_existing_client_id
    returning id into v_client_id;
  else
    begin
      insert into public.clients (name, phone, phone_normalized, rut, total_spent, total_orders, last_order_at, company_id)
      values (p_client_name, v_canonical_phone, nullif(v_phone_normalized, ''), coalesce(p_client_rut, 'SIN-RUT-' || floor(extract(epoch from now()))::text), v_final_total, 1, now(), v_company_id)
      returning id into v_client_id;
    exception when unique_violation then
      raise exception 'duplicate_client_phone' using errcode = '23505';
    end;
  end if;

  v_sequence_group := public.order_sequence_group(v_channel, v_row_client_name, v_row_delivery_fee, v_row_delivery_address, v_handoff);
  v_base_offset := case v_sequence_group when 'mesa' then 100 when 'retiro' then 200 when 'delivery' then 300 else 200 end;
  v_business_day := (now() at time zone 'America/Santiago')::date;

  insert into public.daily_order_sequences (branch_id, business_day, sequence_group, last_sequence)
  values (p_branch_id, v_business_day, v_sequence_group, 1)
  on conflict (branch_id, business_day, sequence_group)
  do update set last_sequence = public.daily_order_sequences.last_sequence + 1
  returning last_sequence into v_daily_count;

  v_shift_sequence := v_base_offset + v_daily_count - 1;

  select id into v_shift_id
  from public.cash_shifts
  where branch_id = p_branch_id and status = 'open'
  order by opened_at desc
  limit 1;

  if v_shift_id is not null then
    insert into public.shift_order_sequences (shift_id, sequence_group, last_sequence)
    values (v_shift_id, v_sequence_group, v_shift_sequence)
    on conflict (shift_id, sequence_group)
    do update set last_sequence = greatest(public.shift_order_sequences.last_sequence, excluded.last_sequence);
  end if;

  insert into public.orders (
    client_id, client_name, client_phone, client_rut, items, total, subtotal, tax_total, discount_total,
    discount_coupon_id, payment_type, payment_ref, payment_method_specific, note, status,
    branch_id, company_id, currency, created_at, order_type, channel, delivery_address, delivery_fee,
    handoff_code, shift_id, shift_sequence, payment_breakdown, business_day
  ) values (
    v_client_id, v_row_client_name, v_row_client_phone, v_row_client_rut, v_items, v_final_total, v_subtotal, v_tax_total,
    v_discount_amount, v_coupon_id, p_payment_type, p_payment_ref, p_payment_method_specific, p_note,
    p_status, p_branch_id, v_company_id, v_currency, now(), 'sale', v_channel,
    v_row_delivery_address, v_row_delivery_fee, v_handoff, v_shift_id, v_shift_sequence, v_payment_breakdown, v_business_day
  ) returning id into v_order_id;

  -- La dirección de una cuenta la guarda cifrada el Portal, no esta función.
  if v_fulfillment = 'delivery' and v_client_id is not null and not v_is_account then
    v_delivery_km := null;
    if p_delivery_address ? 'delivery_km' then v_delivery_km := nullif((p_delivery_address ->> 'delivery_km')::numeric, 0); end if;
    perform public.upsert_client_delivery_address(v_client_id, v_company_id, p_delivery_address, v_delivery_km);
  end if;

  select to_jsonb(o.*) into v_new_order from public.orders o where o.id = v_order_id;

  if v_coupon_id is not null then
    insert into public.discount_coupon_redemptions (coupon_id, order_id, company_id, amount_saved, client_phone)
    values (v_coupon_id, v_order_id, v_company_id, v_discount_amount, v_row_client_phone);
    update public.discount_coupons set redemptions_count = redemptions_count + 1, updated_at = now() where id = v_coupon_id;
  end if;

  return v_new_order;
end;
$function$;


CREATE OR REPLACE FUNCTION public.update_order_transaction(p_order_id bigint, p_client_name text, p_client_phone text, p_client_rut text, p_items jsonb, p_payment_type text, p_note text, p_order_type text, p_delivery_address jsonb DEFAULT NULL::jsonb, p_delivery_fee numeric DEFAULT 0, p_coupon_code text DEFAULT NULL::text, p_payment_breakdown jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user_role text;
  v_user_company_id uuid;
  v_order public.orders%rowtype;
  v_normalized jsonb;
  v_items jsonb;
  v_subtotal numeric;
  v_net numeric;
  v_tax_total numeric := 0;
  v_discount_amount numeric := 0;
  v_coupon_id uuid;
  v_coupon_result jsonb;
  v_delivery_fee numeric := 0;
  v_final_total numeric;
  v_fulfillment text;
  v_channel text;
  v_payment_breakdown jsonb;
  v_updated jsonb;
  v_addr jsonb;
  v_canonical_phone text;
  v_client_id uuid;
  v_delivery_km numeric;
  v_tax_rate numeric;
  v_tax_included boolean;
  v_currency text;
  v_preserve_fulfillment boolean;
  v_next_payment_type text;
  v_is_account boolean := false;
begin
  select lower(btrim(u.role)), u.company_id
  into v_user_role, v_user_company_id
  from public.users u
  where u.auth_user_id = auth.uid() and coalesce(u.is_active, true) = true
  limit 1;

  if v_user_company_id is null then raise exception 'auth_required' using errcode = '42501'; end if;
  if v_user_role is null or v_user_role not in ('owner', 'admin', 'ceo', 'cashier') then
    raise exception 'order_edit_not_allowed' using errcode = '42501';
  end if;

  select o.* into v_order
  from public.orders o
  where o.id = p_order_id and o.company_id = v_user_company_id
  for update;

  if not found then raise exception 'order_not_found_or_not_allowed' using errcode = '42501'; end if;

  select t.tax_rate, t.tax_included, t.currency
  into v_tax_rate, v_tax_included, v_currency
  from public.resolve_branch_tax_settings(v_order.branch_id) t;

  v_canonical_phone := public.format_cl_phone_display(p_client_phone);
  v_client_id := v_order.client_id;
  -- Pedido de un cliente con cuenta: su contacto y su dirección cifrada son de la
  -- cuenta. Editar el pedido no los reemplaza ni los copia a la ficha.
  v_is_account := v_client_id is not null and exists (
    select 1 from public.menu_client_accounts a
    where a.client_id = v_client_id and a.company_id = v_user_company_id
  );

  v_normalized := public.validate_and_normalize_order_items(v_order.branch_id, p_items);
  v_items := v_normalized -> 'items';
  v_subtotal := (v_normalized ->> 'subtotal')::numeric;

  v_coupon_result := public.compute_order_coupon_discount(
    v_order.company_id, p_coupon_code, v_subtotal, v_canonical_phone, p_order_id, v_order.client_id
  );
  v_discount_amount := coalesce((v_coupon_result ->> 'discount_amount')::numeric, 0);
  v_coupon_id := (v_coupon_result ->> 'coupon_id')::uuid;

  v_preserve_fulfillment := lower(btrim(coalesce(p_order_type, ''))) = 'sale';

  if v_preserve_fulfillment then
    v_channel := v_order.channel;
    v_addr := v_order.delivery_address;
    v_delivery_fee := coalesce(v_order.delivery_fee, 0);
    if coalesce(nullif(btrim(v_order.channel), ''), 'pickup') in ('salon', 'mesa') then
      v_fulfillment := 'pickup';
    elsif v_order.delivery_address is not null
      or coalesce(v_order.delivery_fee, 0) > 0
      or coalesce(nullif(btrim(v_order.channel), ''), 'pickup') = 'delivery' then
      v_fulfillment := 'delivery';
    else
      v_fulfillment := 'pickup';
    end if;
  else
    v_fulfillment := lower(btrim(coalesce(nullif(btrim(p_order_type), ''), 'pickup')));
    if v_fulfillment in ('envio', 'envío', 'despacho') then v_fulfillment := 'delivery'; end if;

    if v_fulfillment = 'delivery' then
      v_addr := case
        when v_is_account and v_order.delivery_address ? 'sealed' then v_order.delivery_address
        else coalesce(p_delivery_address, v_order.delivery_address)
      end;
      v_delivery_fee := public.resolve_delivery_fee_for_role(
        v_user_role, v_order.branch_id, v_addr, v_subtotal, p_delivery_fee, null::boolean
      );
      v_channel := 'delivery';
    elsif v_fulfillment in ('salon', 'mesa') then
      v_fulfillment := 'pickup';
      v_delivery_fee := 0;
      v_channel := 'salon';
      v_addr := null;
    else
      v_fulfillment := 'pickup';
      v_delivery_fee := 0;
      v_channel := 'pickup';
      v_addr := null;
    end if;
  end if;

  v_net := round(greatest(0::numeric, v_subtotal - v_discount_amount), 2);
  v_tax_total := public.compute_order_tax(v_net, v_tax_rate, v_tax_included);
  if coalesce(v_tax_included, true) then
    v_final_total := v_net;
  else
    v_final_total := v_net + v_tax_total;
  end if;
  if v_fulfillment = 'delivery' then v_final_total := v_final_total + v_delivery_fee; end if;
  v_final_total := round(v_final_total, 2);
  v_next_payment_type := coalesce(p_payment_type, v_order.payment_type);
  if lower(btrim(coalesce(v_next_payment_type, ''))) = 'pendiente' then
    v_payment_breakdown := jsonb_build_object('cash', 0, 'card', 0, 'online', 0);
  else
    v_payment_breakdown := public.normalize_payment_breakdown_for_total(p_payment_breakdown, v_final_total);
  end if;

  update public.orders o
  set client_name = case when v_is_account then o.client_name else coalesce(p_client_name, o.client_name) end,
      client_phone = case when v_is_account then o.client_phone else coalesce(v_canonical_phone, o.client_phone) end,
      client_rut = case when v_is_account then o.client_rut else coalesce(p_client_rut, o.client_rut) end,
      items = v_items,
      subtotal = v_subtotal,
      tax_total = v_tax_total,
      discount_total = v_discount_amount,
      discount_coupon_id = v_coupon_id,
      total = v_final_total,
      currency = coalesce(v_currency, o.currency),
      payment_type = v_next_payment_type,
      note = coalesce(p_note, o.note),
      channel = v_channel,
      delivery_address = case when v_fulfillment = 'delivery' then v_addr else null end,
      delivery_fee = case when v_fulfillment = 'delivery' then v_delivery_fee else 0 end,
      payment_breakdown = v_payment_breakdown,
      updated_at = now()
  where o.id = p_order_id;

  if v_client_id is not null and not v_is_account then
    update public.clients
    set name = coalesce(p_client_name, name),
        rut = case when length(p_client_rut) > 6 then p_client_rut else rut end,
        updated_at = now()
    where id = v_client_id and company_id = v_user_company_id;
  end if;

  if v_fulfillment = 'delivery' and v_client_id is not null and v_addr is not null and not v_is_account then
    v_delivery_km := null;
    if v_addr ? 'delivery_km' then
      v_delivery_km := nullif((v_addr ->> 'delivery_km')::numeric, 0);
    end if;
    perform public.upsert_client_delivery_address(
      v_client_id, v_user_company_id, v_addr, v_delivery_km
    );
  end if;

  select to_jsonb(o.*) into v_updated from public.orders o where o.id = p_order_id;
  return v_updated;
end;
$function$;


commit;
