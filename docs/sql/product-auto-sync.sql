-- Sincroniza automaticamente el estado de productos con sus filas hijas.
-- Objetivo: evitar que un producto inactivo siga visible por tener precios o estado de sucursal activos.

create or replace function public.sync_product_active_state()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if tg_table_name = 'products' then
    if new.is_active = false then
      update public.product_branch
         set is_active = false
       where product_id = new.id
         and is_active is distinct from false;

      update public.product_prices
         set is_active = false
       where product_id = new.id
         and is_active is distinct from false;
    elsif new.is_active = true then
      update public.product_branch
         set is_active = true
       where product_id = new.id
         and is_active is distinct from true;

      update public.product_prices
         set is_active = true
       where product_id = new.id
         and is_active is distinct from true;
    end if;

    return new;
  end if;

  if tg_table_name = 'product_branch' then
    if exists (
      select 1
        from public.products p
       where p.id = new.product_id
         and p.is_active = false
    ) then
      new.is_active := false;
    end if;

    return new;
  end if;

  if tg_table_name = 'product_prices' then
    if exists (
      select 1
        from public.products p
       where p.id = new.product_id
         and p.is_active = false
    ) then
      new.is_active := false;
    end if;

    return new;
  end if;

  return new;
end;
$function$;

drop trigger if exists sync_products_children_inactive on public.products;
create trigger sync_products_children_inactive
after insert or update of is_active on public.products
for each row
execute function public.sync_product_active_state();

drop trigger if exists sync_product_branch_parent_state on public.product_branch;
create trigger sync_product_branch_parent_state
before insert or update of is_active on public.product_branch
for each row
execute function public.sync_product_active_state();

drop trigger if exists sync_product_prices_parent_state on public.product_prices;
create trigger sync_product_prices_parent_state
before insert or update of is_active on public.product_prices
for each row
execute function public.sync_product_active_state();