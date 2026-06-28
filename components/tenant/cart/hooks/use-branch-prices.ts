"use client";

import { useEffect, useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useQuery } from "@tanstack/react-query";
import { fetchCartBranchPrices } from "@/lib/orders/fetch-cart-branch-prices";
import { mergeCartWithBranchPrices, type BranchProductPriceRow } from "../utils/cart-pricing";
import { filterValidProductIds, isValidBranchId, isValidProductId } from "../utils/safe-ids";
import { isUpsellBeverageLineId } from "../cart-context";
import { useCartStore } from "../cart-store";
import type { CartItem } from "../cart-context";

function cartsMergeResultEqual(current: CartItem[], next: CartItem[]): boolean {
  if (current.length !== next.length) return false;
  const byLine = new Map(next.map((x) => [x.lineId, x]));
  for (const x of current) {
    const y = byLine.get(x.lineId);
    if (!y) return false;
    if (
      x.price !== y.price ||
      x.discount_price !== y.discount_price ||
      x.has_discount !== y.has_discount ||
      x.is_active !== y.is_active ||
      x.name !== y.name ||
      x.description !== y.description ||
      x.quantity !== y.quantity
    ) {
      return false;
    }
  }
  return true;
}

export function useBranchPrices(
  isHydrated: boolean,
  selectedBranchId: string | null | undefined,
  supabase: SupabaseClient,
): BranchProductPriceRow[] {
  const cart = useCartStore((s) => s.cart);

  const cartProductIds = useMemo(() => {
    if (!isHydrated || !Array.isArray(cart) || cart.length === 0) return "";
    const uniq = Array.from(new Set(cart.map((item) => item.id))).sort();
    return uniq.join(",");
  }, [cart, isHydrated]);

  const enabled = Boolean(
    isHydrated &&
      cartProductIds &&
      selectedBranchId &&
      isValidBranchId(selectedBranchId),
  );

  const { data: rows = [], isFetched } = useQuery<BranchProductPriceRow[]>({
    queryKey: ["cart-branch-prices", selectedBranchId, cartProductIds],
    queryFn: async () => {
      const ids = filterValidProductIds(cartProductIds.split(","));
      if (ids.length === 0) return [];

      if (typeof window !== "undefined" && selectedBranchId) {
        const res = await fetch(`${window.location.origin}/api/tenant/cart-branch-prices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId: selectedBranchId, productIds: ids }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          rows?: BranchProductPriceRow[];
        };
        if (res.ok && json.ok && Array.isArray(json.rows)) {
          return json.rows;
        }
      }

      return fetchCartBranchPrices(supabase, selectedBranchId!, ids);
    },
    enabled,
    staleTime: 30_000,
  });

  // Quitar líneas de catálogo que ya no existen en la sucursal (carrito viejo en localStorage).
  useEffect(() => {
    if (!enabled || !isFetched) return;

    const requestedIds = filterValidProductIds(cartProductIds.split(","));
    if (requestedIds.length === 0) return;

    const priceIds = new Set(rows.map((row) => String(row.product_id)));
    const currentCart = useCartStore.getState().cart;
    const nextCart = currentCart.filter((item) => {
      const id = String(item.id ?? "");
      if (isUpsellBeverageLineId(id)) return true;
      if (!isValidProductId(id)) return true;
      if (rows.length === 0) return false;
      return priceIds.has(id);
    });

    if (nextCart.length !== currentCart.length) {
      const setCartFn = useCartStore.getState().setCart;
      if (typeof setCartFn === "function") {
        setCartFn(nextCart);
      }
    }
  }, [rows, enabled, isFetched, cartProductIds]);

  // Efecto para actualizar el store de Zustand cuando cambian los precios
  useEffect(() => {
    if (!enabled || rows.length === 0) return;

    const currentCart = useCartStore.getState().cart;
    const nextCart = mergeCartWithBranchPrices(currentCart, rows, {
      omitLinesWithoutPriceWhenBranchHasData: false,
    });

    const isSame = cartsMergeResultEqual(currentCart, nextCart);
    const wouldClear =
      rows.length === 0 && currentCart.length > 0 && nextCart.length < currentCart.length;
    const setCartFn = useCartStore.getState().setCart;
    if (!isSame && !wouldClear && typeof setCartFn === "function") {
      setCartFn(nextCart);
    }
  }, [rows, enabled]);

  return rows;
}
