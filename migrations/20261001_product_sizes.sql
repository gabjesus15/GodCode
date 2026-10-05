-- Tamaños de producto ("Pizza familiar", "Pizza pequeña"…), cada uno con su precio.
--
-- Un tamaño REEMPLAZA el precio del producto (no se suma, a diferencia de un extra).
-- Igual que `product_prices`, el precio es por sucursal: cada fila es (producto, sucursal, tamaño).
-- `product_prices.price` sigue existiendo y el panel lo deja en el precio del tamaño más barato:
-- es el "Desde" del menú y el precio que se cobra si una línea llega sin tamaño (caja antigua).
--
-- Flujo de un pedido con tamaño:
--   item = { id: <product_id>, size_id: <product_sizes.id>, price: <precio del tamaño>, … }
--   validate_and_normalize_order_items toma el precio de product_sizes, ignora la oferta del
--   producto y guarda el nombre como "Producto (Tamaño)" más `size_id` / `size_name`.
--
-- Orden de aplicación: 1) esta migración entera. La tienda (GodCode) tolera que la tabla no
-- exista todavía, así que el código se puede desplegar antes o después.

-- ============================================================
-- 1. Tabla
-- ============================================================

create table if not exists public.product_sizes (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  name        text not null,
  price       numeric(12, 2) not null,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint product_sizes_name_len check (char_length(btrim(name)) between 1 and 40),
  constraint product_sizes_price_positive check (price > 0)
);

-- Los nombres no se repiten dentro de un producto y sucursal: lo valida
-- `admin_set_product_sizes` (un índice único rompería renombres cruzados, A↔B, al guardar).
create index if not exists product_sizes_branch_product_idx
  on public.product_sizes (branch_id, product_id, sort_order);
create index if not exists product_sizes_company_idx
  on public.product_sizes (company_id);

drop trigger if exists trg_product_sizes_updated_at on public.product_sizes;
create or replace function public.set_product_sizes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_product_sizes_updated_at
  before update on public.product_sizes
  for each row execute function public.set_product_sizes_updated_at();

-- ============================================================
-- 2. RLS
-- ============================================================
-- Lectura pública de los tamaños activos (el menú público y el carrito anónimo los leen,
-- igual que los precios) solo de empresas con suscripción vigente: la misma regla que
-- `public_menu_read_products` y `public_menu_read_product_prices` en la base. El personal
-- ve todos los de su empresa. Las escrituras van solo por `admin_set_product_sizes`
-- (security definer), así que no hay policies de escritura para tenants.

alter table public.product_sizes enable row level security;

drop policy if exists admin_full_access on public.product_sizes;
create policy admin_full_access on public.product_sizes
  for all using (is_super_admin()) with check (is_super_admin());

drop policy if exists product_sizes_select_public on public.product_sizes;
create policy product_sizes_select_public on public.product_sizes
  for select using (
    is_active = true
    and exists (
      select 1 from public.companies c
      where c.id = product_sizes.company_id
        and c.subscription_status in ('active', 'trial')
        and (c.subscription_ends_at is null or c.subscription_ends_at > now())
    )
  );

drop policy if exists product_sizes_select_tenant on public.product_sizes;
create policy product_sizes_select_tenant on public.product_sizes
  for select using (company_id = current_user_company_id());

grant select on public.product_sizes to anon, authenticated;

-- Realtime: el menú público refresca cuando cambian (ver use-menu-realtime.ts).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_sizes'
     ) then
    alter publication supabase_realtime add table public.product_sizes;
  end if;
end;
$$;

-- ============================================================
-- 3. admin_set_product_sizes: guarda la lista completa de tamaños de un producto
-- ============================================================
-- p_sizes: [{ id?: uuid, name: text, price: numeric }] en el orden en que se muestran.
--   * con id existente → se actualiza (el id se conserva: los carritos abiertos siguen valiendo);
--   * sin id → se crea;
--   * los que ya no vienen → se borran.
--   * lista vacía → el producto queda sin tamaños.
-- p_apply_to_all_branches: al crear un producto, copia la lista a todas las sucursales donde el
-- producto existe (por nombre, sin ids), igual que `admin_upsert_product_with_branch`.
-- Devuelve los tamaños resultantes de p_branch_id.

create or replace function public.admin_set_product_sizes(
  p_product_id uuid,
  p_branch_id uuid,
  p_sizes jsonb,
  p_apply_to_all_branches boolean default false
)
returns setof public.product_sizes
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_company_id uuid;
  v_branch_ids uuid[];
  v_branch uuid;
  v_size jsonb;
  v_idx integer;
  v_id uuid;
  v_name text;
  v_price numeric;
  v_keep uuid[];
  v_names text[] := '{}';
begin
  if p_product_id is null or p_branch_id is null then
    raise exception 'product_and_branch_required' using errcode = '22000';
  end if;
  if p_sizes is null or jsonb_typeof(p_sizes) <> 'array' then
    raise exception 'sizes_must_be_array' using errcode = '22000';
  end if;
  if jsonb_array_length(p_sizes) > 12 then
    raise exception 'too_many_sizes' using errcode = '22000';
  end if;

  select p.company_id into v_company_id from public.products p where p.id = p_product_id;
  if v_company_id is null then
    raise exception 'product_not_found' using errcode = '22000';
  end if;
  if not public.is_super_admin() and v_company_id is distinct from public.current_user_company_id() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.branches b where b.id = p_branch_id and b.company_id = v_company_id
  ) then
    raise exception 'branch_not_allowed' using errcode = '42501';
  end if;

  -- Validación de la lista completa antes de escribir nada.
  for v_size in select value from jsonb_array_elements(p_sizes) loop
    v_name := btrim(coalesce(v_size ->> 'name', ''));
    v_price := nullif(btrim(coalesce(v_size ->> 'price', '')), '')::numeric;
    if char_length(v_name) = 0 or char_length(v_name) > 40 then
      raise exception 'invalid_size_name' using errcode = '22000';
    end if;
    if v_price is null or v_price <= 0 then
      raise exception 'invalid_size_price' using errcode = '22000';
    end if;
    if lower(v_name) = any (v_names) then
      raise exception 'duplicate_size_name' using errcode = '22000';
    end if;
    v_names := v_names || lower(v_name);
  end loop;

  if coalesce(p_apply_to_all_branches, false) then
    select coalesce(array_agg(pb.branch_id), '{}') into v_branch_ids
    from public.product_branch pb
    join public.branches b on b.id = pb.branch_id
    where pb.product_id = p_product_id and b.company_id = v_company_id;
    if not (p_branch_id = any (v_branch_ids)) then
      v_branch_ids := v_branch_ids || p_branch_id;
    end if;
  else
    v_branch_ids := array[p_branch_id];
  end if;

  foreach v_branch in array v_branch_ids loop
    v_keep := '{}';
    -- Los ids solo valen en la sucursal editada; en las demás se empareja por nombre.
    v_idx := 0;
    for v_size in select value from jsonb_array_elements(p_sizes) loop
      v_name := btrim(v_size ->> 'name');
      v_price := (v_size ->> 'price')::numeric;
      v_id := null;
      if v_branch = p_branch_id and public.is_valid_uuid(coalesce(v_size ->> 'id', '')) then
        select ps.id into v_id from public.product_sizes ps
        where ps.id = (v_size ->> 'id')::uuid and ps.product_id = p_product_id and ps.branch_id = v_branch;
      end if;
      if v_id is null then
        select ps.id into v_id from public.product_sizes ps
        where ps.product_id = p_product_id and ps.branch_id = v_branch
          and lower(btrim(ps.name)) = lower(v_name)
          and not (ps.id = any (v_keep))
        limit 1;
      end if;

      if v_id is not null and v_id = any (v_keep) then
        v_id := null;
      end if;

      if v_id is not null then
        update public.product_sizes
        set name = v_name, price = v_price, sort_order = v_idx, is_active = true
        where id = v_id;
      else
        insert into public.product_sizes (company_id, product_id, branch_id, name, price, sort_order)
        values (v_company_id, p_product_id, v_branch, v_name, v_price, v_idx)
        returning id into v_id;
      end if;
      v_keep := v_keep || v_id;
      v_idx := v_idx + 1;
    end loop;

    delete from public.product_sizes ps
    where ps.product_id = p_product_id and ps.branch_id = v_branch
      and not (ps.id = any (v_keep));
  end loop;

  return query
    select * from public.product_sizes ps
    where ps.product_id = p_product_id and ps.branch_id = p_branch_id
    order by ps.sort_order, ps.name;
end;
$$;

revoke all on function public.admin_set_product_sizes(uuid, uuid, jsonb, boolean) from public, anon;
grant execute on function public.admin_set_product_sizes(uuid, uuid, jsonb, boolean) to authenticated;

-- ============================================================
-- 4. validate_and_normalize_order_items: precio por tamaño
-- ============================================================
-- Basada en la versión de GodCode-Panel 20260926_preserve_line_id_in_normalized_items.sql.
-- Único cambio: si el item trae `size_id`, el precio y el nombre salen de product_sizes.
-- ANTES DE APLICAR: comparar con la definición viva (pg_get_functiondef) por si cambió después.

CREATE OR REPLACE FUNCTION public.validate_and_normalize_order_items(p_branch_id uuid, p_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_delivery_settings jsonb;
  v_item jsonb;
  v_item_id text;
  v_product_id uuid;
  v_qty integer;
  v_name text;
  v_price numeric;
  v_has_discount boolean;
  v_discount_price numeric;
  v_unit_price numeric;
  v_extras_total numeric;
  v_manual_source text;
  v_is_extra boolean;
  v_note text;
  v_description text;
  v_catalog_row jsonb;
  v_catalog_price numeric;
  v_client_price numeric;
  v_line_id text;
  v_size_id_raw text;
  v_size_id uuid;
  v_size_name text;
  v_size_price numeric;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_force_catalog boolean;
begin
  if p_branch_id is null then raise exception 'branch_required' using errcode = '22000'; end if;
  if p_items is null or jsonb_array_length(p_items) is null or jsonb_array_length(p_items) = 0 then raise exception 'items_required' using errcode = '22000'; end if;

  select b.delivery_settings into v_delivery_settings from public.branches b where b.id = p_branch_id;

  for v_item in select value from jsonb_array_elements(p_items) as t(value) loop
    v_item_id := btrim(coalesce(v_item ->> 'id', ''));
    if v_item_id = '' then raise exception 'invalid_item_price' using errcode = '22000'; end if;

    v_qty := greatest(1, coalesce((v_item ->> 'quantity')::integer, 1));
    v_manual_source := lower(btrim(coalesce(v_item ->> 'manual_order_source', '')));
    v_is_extra := coalesce((v_item ->> 'is_extra')::boolean, false);
    v_note := nullif(btrim(coalesce(v_item ->> 'note', '')), '');
    if v_note is not null and length(v_note) > 140 then v_note := left(v_note, 140); end if;
    v_description := nullif(btrim(coalesce(v_item ->> 'description', '')), '');
    v_extras_total := greatest(0, coalesce((v_item ->> 'extras_total')::numeric, 0));
    v_client_price := (v_item ->> 'price')::numeric;
    v_line_id := nullif(btrim(coalesce(v_item ->> 'line_id', v_item ->> 'lineId', '')), '');
    v_size_id_raw := nullif(btrim(coalesce(v_item ->> 'size_id', '')), '');

    v_force_catalog := not public.is_valid_uuid(v_item_id) or v_is_extra or v_manual_source in ('extras', 'beverages');

    v_product_id := null; v_name := null; v_price := null; v_has_discount := false; v_discount_price := null;
    v_size_id := null; v_size_name := null; v_size_price := null;

    if not v_force_catalog and public.is_valid_uuid(v_item_id) then
      v_product_id := v_item_id::uuid;
      select p.name, pp.price, pp.has_discount, pp.discount_price
      into v_name, v_price, v_has_discount, v_discount_price
      from public.product_prices pp
      join public.products p on p.id = pp.product_id
      join public.product_branch pb on pb.product_id = pp.product_id
      where pp.product_id = v_product_id and pp.branch_id = p_branch_id and pp.is_active = true and pb.branch_id = p_branch_id and pb.is_active = true;
      if v_price is null then raise exception 'invalid_item_price' using errcode = '22000'; end if;

      -- Tamaño: reemplaza el precio del producto; la oferta del producto no aplica.
      if v_size_id_raw is not null then
        if not public.is_valid_uuid(v_size_id_raw) then raise exception 'invalid_item_price' using errcode = '22000'; end if;
        select ps.id, ps.name, ps.price into v_size_id, v_size_name, v_size_price
        from public.product_sizes ps
        where ps.id = v_size_id_raw::uuid and ps.product_id = v_product_id and ps.branch_id = p_branch_id and ps.is_active = true;
        if v_size_id is null then raise exception 'invalid_item_price' using errcode = '22000'; end if;
        v_price := v_size_price; v_has_discount := false; v_discount_price := null;
        v_name := coalesce(v_name, 'Producto') || ' (' || v_size_name || ')';
      end if;
    else
      v_catalog_row := public.lookup_cart_upsell_catalog_row(coalesce(v_delivery_settings, '{}'::jsonb), v_item_id);
      if v_catalog_row is null then raise exception 'invalid_item_price' using errcode = '22000'; end if;
      v_name := coalesce(nullif(btrim(v_catalog_row ->> 'name'), ''), 'Extra');
      v_catalog_price := (v_catalog_row ->> 'price')::numeric;
      if v_catalog_price is null or v_catalog_price < 0 then raise exception 'invalid_item_price' using errcode = '22000'; end if;
      v_price := v_catalog_price; v_has_discount := false; v_discount_price := null; v_product_id := null;
      if v_manual_source = '' then v_manual_source := case when v_is_extra then 'extras' else 'beverages' end; end if;
    end if;

    if v_client_price is not null and abs(v_client_price - v_price) > 0.01 then raise exception 'invalid_item_price' using errcode = '22000'; end if;

    v_unit_price := case when coalesce(v_has_discount, false) and v_discount_price is not null and v_discount_price > 0 then v_discount_price else v_price end;
    v_unit_price := greatest(0, v_unit_price + v_extras_total);
    v_subtotal := v_subtotal + (v_unit_price * v_qty);

    v_items := v_items || jsonb_build_array(
      jsonb_build_object('id', coalesce(v_product_id::text, v_item_id), 'name', coalesce(v_name, 'Producto'), 'quantity', v_qty, 'price', v_price, 'has_discount', coalesce(v_has_discount, false), 'discount_price', v_discount_price, 'extras_total', v_extras_total, 'extras', coalesce(v_item -> 'extras', '[]'::jsonb), 'description', v_description, 'note', v_note, 'manual_order_source', nullif(v_manual_source, ''), 'is_extra', v_is_extra or v_manual_source = 'extras')
      || case when v_line_id is not null then jsonb_build_object('line_id', v_line_id) else '{}'::jsonb end
      || case when v_size_id is not null then jsonb_build_object('size_id', v_size_id, 'size_name', v_size_name) else '{}'::jsonb end
    );
  end loop;

  if jsonb_array_length(v_items) = 0 then raise exception 'no_items_available' using errcode = '22000'; end if;
  return jsonb_build_object('items', v_items, 'subtotal', round(v_subtotal, 2));
end;
$function$;
