"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergeCartWithBranchPrices, type BranchProductPriceRow } from "../utils/cart-pricing";
import { filterValidProductIds, isValidBranchId } from "../utils/safe-ids";
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

type LegacyPriceRow = {
  product_id: string;
  price: number;
  has_discount: boolean;
  discount_price: number;
  products?:
    | {
        id: string;
        name?: string | null;
        is_active?: boolean | null;
        description?: string | null;
      }
    | {
        id: string;
        name?: string | null;
        is_active?: boolean | null;
        description?: string | null;
      }[]
    | null;
};

function normalizeProductJoin(
  products: LegacyPriceRow["products"],
): { id: string; name?: string | null; is_active?: boolean | null; description?: string | null } | undefined {
  if (products == null) return undefined;
  const row = Array.isArray(products) ? products[0] : products;
  if (!row || typeof row !== "object") return undefined;
  return {
    id: String((row as { id: unknown }).id),
    name: (row as { name?: string | null }).name ?? null,
    is_active: (row as { is_active?: boolean | null }).is_active ?? null,
    description: (row as { description?: string | null }).description ?? null,
  };
}

function mapRpcRow(row: Record<string, unknown>): BranchProductPriceRow {
  return {
    product_id: String(row.product_id ?? ""),
    price: Number(row.price),
    has_discount: Boolean(row.has_discount),
    discount_price: Number(row.discount_price),
    products: {
      id: String(row.product_id ?? ""),
      name: (row.product_name as string | null | undefined) ?? null,
      is_active: (row.product_is_active as boolean | null | undefined) ?? null,
      description: (row.product_description as string | null | undefined) ?? null,
    },
  };
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

  const [branchPriceRows, setBranchPriceRows] = useState<BranchProductPriceRow[]>([]);

  useEffect(() => {
    if (!isHydrated || !cartProductIds || !selectedBranchId) return;
    if (!isValidBranchId(selectedBranchId)) return;

    let cancelled = false;

    const validatePrices = async () => {
      const ids = filterValidProductIds(cartProductIds.split(","));
      if (ids.length === 0) return;

      try {
        let rows: BranchProductPriceRow[] = [];

        const rpc = await supabase.rpc("get_cart_branch_prices", {
          p_branch_id: selectedBranchId,
          p_product_ids: ids,
        });

        if (!rpc.error && Array.isArray(rpc.data) && rpc.data.length >= 0) {
          rows = (rpc.data as Record<string, unknown>[]).map(mapRpcRow);
        } else {
          const { data, error } = await supabase
            .from("product_prices")
            .select(
              "product_id, price, has_discount, discount_price, products(id,name,is_active,description)",
            )
            .in("product_id", ids)
            .eq("branch_id", selectedBranchId);
          if (cancelled || error) return;
          rows = (data || []).map((row: LegacyPriceRow) => {
            const meta = normalizeProductJoin(row.products);
            return {
              product_id: String(row.product_id),
              price: Number(row.price),
              has_discount: Boolean(row.has_discount),
              discount_price: Number(row.discount_price),
              products: meta
                ? {
                    id: meta.id,
                    name: meta.name ?? null,
                    is_active: meta.is_active ?? null,
                    description: meta.description ?? null,
                  }
                : undefined,
            };
          });
        }

        if (cancelled) return;
        setBranchPriceRows(rows);

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
      } catch (err) {
        console.error("Error validando precios:", err);
      }
    };

    void validatePrices();
    return () => {
      cancelled = true;
    };
  }, [selectedBranchId, cartProductIds, supabase, isHydrated]);

  return branchPriceRows;
}
