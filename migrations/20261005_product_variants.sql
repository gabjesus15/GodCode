-- Variantes de producto: grupos de opción única y obligatoria que cambian el producto
-- principal ("Proteína: carne / pollo / mixta", "Masa: fina / gruesa").
--
-- A diferencia del tamaño (que REEMPLAZA el precio), la variante SUMA `price_delta`
-- (0, positivo o negativo) al precio base o al del tamaño, y también a la oferta si la
-- hay. Igual que `product_sizes`, cada fila es (producto, sucursal, grupo, opción). La
-- primera opción de cada grupo (por sort_order) es la predeterminada; el menú exige
-- elegir una por grupo antes de agregar. En un pedido el item trae
--   { id: <product_id>, size_id?, variant_ids: [<product_variants.id>, …], price: <base o tamaño + deltas> }
-- y `validate_and_normalize_order_items` valida cada variante contra la base, recompone
-- el nombre como "Producto (Tamaño, Pollo)" y guarda variant_ids / variant_names /
-- variant_delta en el item.
--
-- Orden de aplicación: después de 20261001_product_sizes (esta migración vuelve a definir
-- `validate_and_normalize_order_items` con tamaños + variantes, partiendo de esa versión).
-- La tienda tolera que la tabla no exista todavía.

-- ============================================================
-- 1. Tabla
-- ============================================================

create table if not exists public.product_variants (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  group_name  text not null,
  name        text not null,
  price_delta numeric(12, 2) not null default 0,
  image_url   text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint product_variants_group_len check (char_length(btrim(group_name)) between 1 and 40),
  constraint product_variants_name_len check (char_length(btrim(name)) between 1 and 40),
  constraint product_variants_image_len check (image_url is null or char_length(image_url) <= 600)
);

create index if not exists product_variants_branch_product_idx
  on public.product_variants (branch_id, product_id, sort_order);
create index if not exists product_variants_company_idx
  on public.product_variants (company_id);

drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create or replace function public.set_product_variants_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_product_variants_updated_at
  before update on public.product_variants
  for each row execute function public.set_product_variants_updated_at();

-- ============================================================
-- 2. RLS (misma regla que product_sizes)
-- ============================================================

alter table public.product_variants enable row level security;

drop policy if exists admin_full_access on public.product_variants;
create policy admin_full_access on public.product_variants
  for all using (is_super_admin()) with check (is_super_admin());

drop policy if exists product_variants_select_public on public.product_variants;
create policy product_variants_select_public on public.product_variants
  for select using (
    is_active = true
    and exists (
      select 1 from public.companies c
      where c.id = product_variants.company_id
        and c.subscription_status in ('active', 'trial')
        and (c.subscription_ends_at is null or c.subscription_ends_at > now())
    )
  );

drop policy if exists product_variants_select_tenant on public.product_variants;
create policy product_variants_select_tenant on public.product_variants
  for select using (company_id = current_user_company_id());

grant select on public.product_variants to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'product_variants'
     ) then
    alter publication supabase_realtime add table public.product_variants;
  end if;
end;
$$;

-- ============================================================
-- 3. admin_set_product_variants: guarda la lista completa de variantes de un producto
-- ============================================================
-- p_variants: [{ id?: uuid, group_name: text, name: text, price_delta?: numeric, image_url?: text }]
-- en el orden en que se muestran (las opciones de un mismo grupo van seguidas).
--   * con id existente → se actualiza (el id se conserva: los carritos abiertos siguen valiendo);
--   * sin id → se crea; los que ya no vienen → se borran; lista vacía → sin variantes.
-- p_apply_to_all_branches: copia la lista a todas las sucursales donde el producto existe
-- (emparejando por grupo+nombre, sin ids). Devuelve las variantes resultantes de p_branch_id.

create or replace function public.admin_set_product_variants(
  p_product_id uuid,
  p_branch_id uuid,
  p_variants jsonb,
  p_apply_to_all_branches boolean default false
)
returns setof public.product_variants
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_company_id uuid;
  v_branch_ids uuid[];
  v_branch uuid;
  v_row jsonb;
  v_idx integer;
  v_id uuid;
  v_group text;
  v_name text;
  v_delta numeric;
  v_image text;
  v_keep uuid[];
  v_keys text[] := '{}';
begin
  if p_product_id is null or p_branch_id is null then
    raise exception 'product_and_branch_required' using errcode = '22000';
  end if;
  if p_variants is null or jsonb_typeof(p_variants) <> 'array' then
    raise exception 'variants_must_be_array' using errcode = '22000';
  end if;
  if jsonb_array_length(p_variants) > 24 then
    raise exception 'too_many_variants' using errcode = '22000';
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
  for v_row in select value from jsonb_array_elements(p_variants) loop
    v_group := btrim(coalesce(v_row ->> 'group_name', ''));
    v_name := btrim(coalesce(v_row ->> 'name', ''));
    v_delta := coalesce(nullif(btrim(coalesce(v_row ->> 'price_delta', '')), '')::numeric, 0);
    v_image := nullif(btrim(coalesce(v_row ->> 'image_url', '')), '');
    if char_length(v_group) = 0 or char_length(v_group) > 40 then
      raise exception 'invalid_variant_group' using errcode = '22000';
    end if;
    if char_length(v_name) = 0 or char_length(v_name) > 40 then
      raise exception 'invalid_variant_name' using errcode = '22000';
    end if;
    if abs(v_delta) > 999999 then
      raise exception 'invalid_variant_price' using errcode = '22000';
    end if;
    if v_image is not null and char_length(v_image) > 600 then
      raise exception 'invalid_variant_image' using errcode = '22000';
    end if;
    if (lower(v_group) || '|' || lower(v_name)) = any (v_keys) then
      raise exception 'duplicate_variant_name' using errcode = '22000';
    end if;
    v_keys := v_keys || (lower(v_group) || '|' || lower(v_name));
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
    v_idx := 0;
    for v_row in select value from jsonb_array_elements(p_variants) loop
      v_group := btrim(v_row ->> 'group_name');
      v_name := btrim(v_row ->> 'name');
      v_delta := coalesce(nullif(btrim(coalesce(v_row ->> 'price_delta', '')), '')::numeric, 0);
      v_image := nullif(btrim(coalesce(v_row ->> 'image_url', '')), '');
      v_id := null;
      -- Los ids solo valen en la sucursal editada; en las demás se empareja por grupo+nombre.
      if v_branch = p_branch_id and public.is_valid_uuid(coalesce(v_row ->> 'id', '')) then
        select pv.id into v_id from public.product_variants pv
        where pv.id = (v_row ->> 'id')::uuid and pv.product_id = p_product_id and pv.branch_id = v_branch;
      end if;
      if v_id is null then
        select pv.id into v_id from public.product_variants pv
        where pv.product_id = p_product_id and pv.branch_id = v_branch
          and lower(btrim(pv.group_name)) = lower(v_group)
          and lower(btrim(pv.name)) = lower(v_name)
          and not (pv.id = any (v_keep))
        limit 1;
      end if;
      if v_id is not null and v_id = any (v_keep) then
        v_id := null;
      end if;

      if v_id is not null then
        update public.product_variants
        set group_name = v_group, name = v_name, price_delta = v_delta, image_url = v_image,
            sort_order = v_idx, is_active = true
        where id = v_id;
      else
        insert into public.product_variants (company_id, product_id, branch_id, group_name, name, price_delta, image_url, sort_order)
        values (v_company_id, p_product_id, v_branch, v_group, v_name, v_delta, v_image, v_idx)
        returning id into v_id;
      end if;
      v_keep := v_keep || v_id;
      v_idx := v_idx + 1;
    end loop;

    delete from public.product_variants pv
    where pv.product_id = p_product_id and pv.branch_id = v_branch
      and not (pv.id = any (v_keep));
  end loop;

  return query
    select * from public.product_variants pv
    where pv.product_id = p_product_id and pv.branch_id = p_branch_id
    order by pv.sort_order, pv.group_name, pv.name;
end;
$$;

revoke all on function public.admin_set_product_variants(uuid, uuid, jsonb, boolean) from public, anon;
grant execute on function public.admin_set_product_variants(uuid, uuid, jsonb, boolean) to authenticated;

-- ============================================================
-- 4. validate_and_normalize_order_items: tamaños + variantes
-- ============================================================
-- Parte de la versión de 20261001_product_sizes (que es la viva + tamaños). Cambios:
-- `variant_ids` del item se validan contra product_variants (producto, sucursal, activa,
-- una por grupo); la suma de deltas se añade al precio (y a la oferta) ANTES de comparar
-- con el precio que mandó el cliente; el nombre queda "Producto (Tamaño, Variante…)".

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
  v_variant_raw text;
  v_variant_id uuid;
  v_variant_group text;
  v_variant_name text;
  v_variant_price numeric;
  v_variant_ids uuid[];
  v_variant_names text[];
  v_variant_groups text[];
  v_variant_delta numeric;
  v_name_parts text[];
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
    v_variant_ids := '{}'; v_variant_names := '{}'; v_variant_groups := '{}'; v_variant_delta := 0; v_name_parts := '{}';

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
        v_name_parts := v_name_parts || v_size_name;
      end if;

      -- Variantes: una por grupo; su delta se suma al precio (y a la oferta) antes de
      -- comparar con lo que mandó el cliente.
      if v_item ? 'variant_ids' and jsonb_typeof(v_item -> 'variant_ids') = 'array' then
        for v_variant_raw in select value #>> '{}' from jsonb_array_elements(v_item -> 'variant_ids') loop
          if not public.is_valid_uuid(coalesce(v_variant_raw, '')) then raise exception 'invalid_item_price' using errcode = '22000'; end if;
          v_variant_id := null;
          select pv.id, pv.group_name, pv.name, pv.price_delta
          into v_variant_id, v_variant_group, v_variant_name, v_variant_price
          from public.product_variants pv
          where pv.id = v_variant_raw::uuid and pv.product_id = v_product_id and pv.branch_id = p_branch_id and pv.is_active = true;
          if v_variant_id is null then raise exception 'invalid_item_price' using errcode = '22000'; end if;
          if lower(v_variant_group) = any (v_variant_groups) then raise exception 'invalid_item_price' using errcode = '22000'; end if;
          v_variant_groups := v_variant_groups || lower(v_variant_group);
          v_variant_ids := v_variant_ids || v_variant_id;
          v_variant_names := v_variant_names || v_variant_name;
          v_variant_delta := v_variant_delta + coalesce(v_variant_price, 0);
        end loop;
        if cardinality(v_variant_ids) > 0 then
          v_price := v_price + v_variant_delta;
          if coalesce(v_has_discount, false) and v_discount_price is not null and v_discount_price > 0 then
            v_discount_price := v_discount_price + v_variant_delta;
          end if;
          if v_price <= 0 then raise exception 'invalid_item_price' using errcode = '22000'; end if;
          v_name_parts := v_name_parts || v_variant_names;
        end if;
      end if;

      if cardinality(v_name_parts) > 0 then
        v_name := coalesce(v_name, 'Producto') || ' (' || array_to_string(v_name_parts, ', ') || ')';
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
      || case when cardinality(v_variant_ids) > 0 then jsonb_build_object('variant_ids', to_jsonb(v_variant_ids), 'variant_names', to_jsonb(v_variant_names), 'variant_delta', v_variant_delta) else '{}'::jsonb end
    );
  end loop;

  if jsonb_array_length(v_items) = 0 then raise exception 'no_items_available' using errcode = '22000'; end if;
  return jsonb_build_object('items', v_items, 'subtotal', round(v_subtotal, 2));
end;
$function$;
