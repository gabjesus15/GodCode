-- Precios de carrito por sucursal en una sola llamada (evita N+1 / join pesado desde el cliente).
-- Usado por `useBranchPrices` vía RPC; si falla, el cliente hace fallback a `product_prices`.

CREATE OR REPLACE FUNCTION public.get_cart_branch_prices(
  p_branch_id uuid,
  p_product_ids uuid[]
)
RETURNS TABLE (
  product_id uuid,
  price numeric,
  has_discount boolean,
  discount_price numeric,
  product_name text,
  product_is_active boolean,
  product_description text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    pp.product_id,
    pp.price::numeric,
    pp.has_discount,
    COALESCE(pp.discount_price, 0)::numeric AS discount_price,
    p.name::text AS product_name,
    COALESCE(p.is_active, false) AS product_is_active,
    p.description::text AS product_description
  FROM public.product_prices pp
  INNER JOIN public.products p ON p.id = pp.product_id
  WHERE pp.branch_id = p_branch_id
    AND pp.product_id = ANY(p_product_ids)
    AND COALESCE(pp.is_active, true) = true;
$$;

GRANT EXECUTE ON FUNCTION public.get_cart_branch_prices(uuid, uuid[]) TO anon, authenticated;
