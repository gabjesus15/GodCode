-- Menu web: pedidos confirmados en carrito -> channel = online (compra online en panel)
DROP FUNCTION IF EXISTS public.create_order_transaction(
  text, text, text, jsonb, numeric, text, text, text, uuid, uuid, text, text, text, jsonb, numeric, text
);

CREATE OR REPLACE FUNCTION public.create_order_transaction(p_client_name text, p_client_phone text, p_client_rut text, p_items jsonb, p_total numeric, p_payment_type text, p_payment_ref text, p_note text, p_branch_id uuid, p_company_id uuid, p_status text, p_payment_method_specific text DEFAULT NULL::text, p_order_type text DEFAULT 'pickup'::text, p_delivery_address jsonb DEFAULT NULL::jsonb, p_delivery_fee numeric DEFAULT (0)::numeric, p_coupon_code text DEFAULT NULL::text, p_order_origin text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_client_id uuid;
  v_new_order jsonb;
  v_existing_client_id uuid;
  v_company_id uuid;
  v_items jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_subtotal numeric := 0;
  v_final_total numeric := 0;
  v_delivery_fee numeric := 0;
  v_fulfillment text;
  v_channel text;
  v_handoff text;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_name text;
  v_price numeric;
  v_has_discount boolean;
  v_discount_price numeric;
  v_unit_price numeric;
  v_extras_total numeric;
  i int;
  v_discount_amount numeric := 0;
  v_coupon_id uuid;
  coupon_rec public.discount_coupons%ROWTYPE;
  v_redemptions_client int;
  v_order_id bigint;
  v_shift_id uuid;
  v_shift_sequence int;
begin
  if p_branch_id is null then
    raise exception 'branch_required' using errcode = '22000';
  end if;

  if p_items is null or jsonb_array_length(p_items) is null then
    raise exception 'items_required' using errcode = '22000';
  end if;

  if p_company_id is null then
    select company_id into v_company_id from public.branches where id = p_branch_id;
  else
    v_company_id := p_company_id;
  end if;

  if v_company_id is null then
    raise exception 'company_not_found' using errcode = 'P0001';
  end if;

  select id into v_shift_id
    from public.cash_shifts
   where branch_id = p_branch_id and status = 'open'
   order by opened_at desc
   limit 1
   for update;

  if v_shift_id is not null then
    select coalesce(max(shift_sequence), 0) + 1
      into v_shift_sequence
      from public.orders
     where shift_id = v_shift_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := null;
    begin
      v_product_id := (v_item->>'id')::uuid;
    exception when others then
      v_product_id := null;
    end;
    v_qty := greatest(1, coalesce((v_item->>'quantity')::int, 1));
    v_name := null;
    v_price := null;
    v_has_discount := false;
    v_discount_price := null;
    v_extras_total := greatest(0, coalesce((v_item->>'extras_total')::numeric, 0));

    if v_product_id is not null then
      select p.name, pp.price, pp.has_discount, pp.discount_price
        into v_name, v_price, v_has_discount, v_discount_price
        from public.product_prices pp
        join public.products p on p.id = pp.product_id
        join public.product_branch pb on pb.product_id = pp.product_id
       where pp.product_id = v_product_id and pp.branch_id = p_branch_id and pp.is_active = true
         and pb.branch_id = p_branch_id and pb.is_active = true;
    end if;

    v_name := coalesce(v_name, nullif(trim(v_item->>'name'), ''), 'Producto');
    v_price := coalesce(v_price, (v_item->>'price')::numeric);
    if v_price is null or v_price < 0 then v_price := 0; end if;
    v_has_discount := coalesce(v_has_discount, (v_item->>'has_discount')::boolean, false);
    v_discount_price := case when (v_item->>'discount_price') is not null then (v_item->>'discount_price')::numeric else v_discount_price end;
    v_unit_price := case when coalesce(v_has_discount, false) and v_discount_price is not null and v_discount_price > 0 then v_discount_price else v_price end;
    v_unit_price := greatest(0, v_unit_price + v_extras_total);
    v_total := v_total + (v_unit_price * v_qty);
    v_items := v_items || jsonb_build_array(
      jsonb_build_object(
        'id', v_product_id,
        'name', v_name,
        'quantity', v_qty,
        'price', v_price,
        'has_discount', coalesce(v_has_discount, false),
        'discount_price', v_discount_price,
        'extras_total', v_extras_total,
        'extras', coalesce(v_item->'extras', '[]'::jsonb),
        'description', v_item->>'description'
      )
    );
  end loop;

  if jsonb_array_length(v_items) = 0 then
    raise exception 'no_items_available' using errcode = '22000';
  end if;

  v_subtotal := v_total;

  select id into v_existing_client_id from public.clients where phone = p_client_phone limit 1;

  v_fulfillment := lower(trim(coalesce(nullif(trim(p_order_type), ''), 'pickup')));

  if v_fulfillment = 'delivery' then
    if p_delivery_address is null or p_delivery_address = 'null'::jsonb then
      raise exception 'delivery_address_required' using errcode = '22000';
    end if;
    v_delivery_fee := greatest(0, coalesce(p_delivery_fee, 0));
    v_handoff := null;
    for i in 1..20 loop
      v_handoff := lpad((floor(random() * 900000) + 100000)::text, 6, '0');
      exit when not exists (select 1 from public.orders o where o.handoff_code is not null and o.handoff_code = v_handoff);
    end loop;
    if exists (select 1 from public.orders o where o.handoff_code is not null and o.handoff_code = v_handoff) then
      raise exception 'handoff_code_collision' using errcode = '22000';
    end if;
  else
    v_delivery_fee := 0;
    v_handoff := null;
    v_fulfillment := 'pickup';
  end if;

  if p_order_origin is not null and lower(btrim(p_order_origin)) in ('web', 'online', 'menu') then
    v_channel := 'online';
  elsif v_fulfillment = 'delivery' then
    v_channel := 'delivery';
  else
    v_channel := 'pickup';
  end if;

  v_discount_amount := 0;
  v_coupon_id := null;

  if p_coupon_code is not null and btrim(p_coupon_code) <> '' then
    select * into coupon_rec from public.discount_coupons c
    where c.company_id = v_company_id
      and upper(btrim(c.code)) = upper(btrim(p_coupon_code))
      and c.is_active = true
    for update;

    if not found then
      raise exception 'invalid_coupon' using errcode = '22000';
    end if;

    if coupon_rec.valid_from is not null and now() < coupon_rec.valid_from then
      raise exception 'coupon_expired' using errcode = '22000';
    end if;
    if coupon_rec.valid_until is not null and now() > coupon_rec.valid_until then
      raise exception 'coupon_expired' using errcode = '22000';
    end if;

    if v_subtotal + 1e-9 < coalesce(coupon_rec.min_order_subtotal, 0) then
      raise exception 'coupon_min_subtotal' using errcode = '22000';
    end if;

    if coupon_rec.scope = 'client_only' then
      if coupon_rec.restricted_client_id is null or v_existing_client_id is null or v_existing_client_id <> coupon_rec.restricted_client_id then
        raise exception 'coupon_wrong_client' using errcode = '22000';
      end if;
    end if;

    if coupon_rec.max_redemptions is not null and coupon_rec.redemptions_count >= coupon_rec.max_redemptions then
      raise exception 'coupon_usage_exhausted' using errcode = '22000';
    end if;

    select count(*)::int into v_redemptions_client from public.discount_coupon_redemptions r
    where r.coupon_id = coupon_rec.id and coalesce(r.client_phone, '') = coalesce(p_client_phone, '');

    if v_redemptions_client >= coupon_rec.max_redemptions_per_client then
      raise exception 'coupon_usage_exhausted_client' using errcode = '22000';
    end if;

    if coupon_rec.discount_type = 'percent' then
      v_discount_amount := round(v_subtotal * least(100::numeric, greatest(0::numeric, coupon_rec.discount_value)) / 100.0, 2);
    elsif coupon_rec.discount_type = 'fixed_amount' then
      v_discount_amount := least(v_subtotal, greatest(0::numeric, coupon_rec.discount_value));
    else
      raise exception 'invalid_coupon' using errcode = '22000';
    end if;

    if v_discount_amount is null or v_discount_amount <= 0 then
      raise exception 'invalid_coupon' using errcode = '22000';
    end if;

    v_coupon_id := coupon_rec.id;
  end if;

  v_final_total := greatest(0::numeric, v_subtotal - v_discount_amount) + v_delivery_fee;

  if abs(coalesce(p_total, 0) - v_final_total) > 50 then
    raise exception 'invalid_item_price' using errcode = '22000';
  end if;

  if v_existing_client_id is not null then
    update public.clients
       set name = coalesce(p_client_name, name),
           rut = case when length(p_client_rut) > 6 then p_client_rut else rut end,
           total_spent = coalesce(total_spent, 0) + v_final_total,
           total_orders = coalesce(total_orders, 0) + 1,
           last_order_at = now()
     where id = v_existing_client_id
     returning id into v_client_id;
  else
    insert into public.clients (name, phone, rut, total_spent, total_orders, last_order_at, company_id)
    values (
      p_client_name,
      p_client_phone,
      coalesce(p_client_rut, 'SIN-RUT-' || floor(extract(epoch from now()))::text),
      v_final_total, 1, now(), v_company_id
    )
    returning id into v_client_id;
  end if;

  insert into public.orders (
    client_id, client_name, client_phone, client_rut,
    items, total, subtotal, discount_total, discount_coupon_id,
    payment_type, payment_ref, payment_method_specific, note,
    status, branch_id, company_id, created_at,
    order_type, channel, delivery_address, delivery_fee, handoff_code,
    shift_id, shift_sequence
  ) values (
    v_client_id, p_client_name, p_client_phone, p_client_rut,
    v_items, v_final_total, v_subtotal, v_discount_amount, v_coupon_id,
    p_payment_type, p_payment_ref, p_payment_method_specific, p_note,
    p_status, p_branch_id, v_company_id, now(),
    'sale', v_channel,
    case when v_fulfillment = 'delivery' then p_delivery_address else null end,
    case when v_fulfillment = 'delivery' then v_delivery_fee else 0 end,
    v_handoff,
    v_shift_id, v_shift_sequence
  )
  returning id into v_order_id;

  select to_jsonb(o.*) into v_new_order from public.orders o where o.id = v_order_id;

  if v_coupon_id is not null then
    insert into public.discount_coupon_redemptions (coupon_id, order_id, company_id, amount_saved, client_phone)
    values (v_coupon_id, v_order_id, v_company_id, v_discount_amount, p_client_phone);

    update public.discount_coupons
       set redemptions_count = redemptions_count + 1,
           updated_at = now()
     where id = v_coupon_id;
  end if;

  return v_new_order;
end;
$function$
