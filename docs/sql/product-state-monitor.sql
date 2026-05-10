-- Detecta productos desactivados que siguen teniendo precio y estado de sucursal activos.
-- Útil para revisar inconsistencias antes de que desaparezcan del menú o del pedido manual.

select
  p.id,
  p.name,
  p.is_active,
  p.created_at,
  p.updated_at,
  count(distinct pp.branch_id) as branches_with_price
from public.products p
join public.product_prices pp
  on pp.product_id = p.id
 and pp.is_active = true
join public.product_branch pb
  on pb.product_id = p.id
 and pb.branch_id = pp.branch_id
 and pb.is_active = true
where p.is_active = false
group by p.id, p.name, p.is_active, p.created_at, p.updated_at
order by coalesce(p.updated_at, p.created_at) desc nulls last, p.name;

-- Si quieres corregirlos manualmente en bloque, usa esto con cuidado:
-- update public.products
-- set is_active = true,
--     updated_at = now()
-- where id in (
--   select p.id
--   from public.products p
--   join public.product_prices pp
--     on pp.product_id = p.id
--    and pp.is_active = true
--   join public.product_branch pb
--     on pb.product_id = p.id
--    and pb.branch_id = pp.branch_id
--    and pb.is_active = true
--   where p.is_active = false
-- );