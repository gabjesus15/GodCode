"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCartStore } from "../cart/cart-store";
import type { CartItem } from "../cart/cart-context";
import { getTenantScopedPath } from "../utils/tenant-route";

import type { MenuAccountOrder } from "./menu-account-types";

/** Mismo tope por línea que `addToCart`. */
const MAX_LINE_QUANTITY = 20;

/** Líneas del pedido que se pueden volver a poner en el carrito. */
export function repeatableItems(order: MenuAccountOrder) {
	return order.items.filter((item) => item.productId);
}

/**
 * "Repetir pedido": reemplaza el carrito por los productos del pedido y abre el menú
 * en la misma sucursal con el carrito abierto.
 *
 * Los precios que se copian son los del pedido original a propósito: al llegar al
 * menú, el provider del carrito los reemplaza por los vigentes de la sucursal y quita
 * los productos que ya no se venden, igual que con un carrito guardado de otra visita.
 *
 */
export function useRepeatOrder() {
	const router = useRouter();
	const pathname = usePathname();

	const menuPath = useCallback(
		(branchId?: string | null) => {
			const base = getTenantScopedPath(pathname ?? "/", "/menu");
			return branchId ? `${base}?branch=${encodeURIComponent(branchId)}` : base;
		},
		[pathname],
	);

	const repeatOrder = useCallback(
		async (order: MenuAccountOrder): Promise<boolean> => {
			const items = repeatableItems(order);
			if (items.length === 0) return false;

			const cart: CartItem[] = items.map((item, index) => ({
				lineId: `${item.productId}:repeat:${Date.now().toString(36)}${index}`,
				id: item.productId as string,
				name: item.name,
				price: item.unitPrice,
				has_discount: false,
				discount_price: null,
				quantity: Math.min(Math.max(1, Math.round(item.quantity)), MAX_LINE_QUANTITY),
				selected_extras: item.extras
					.filter((extra) => extra.id)
					.map((extra) => ({
						id: extra.id as string,
						name: extra.name,
						price: extra.price,
						qty: extra.quantity,
					})),
				selected_beverages: [],
				line_summary: null,
				line_note: item.note,
			}));

			/* El carrito persiste en una sola clave (`tenant_cart_storage`), la misma que
			   lee el provider del menú. Se rehidrata antes de escribir para no pisar lo
			   que ya haya guardado (extras globales, nota) desde otra visita. */
			const persistApi = (useCartStore as unknown as { persist?: { rehydrate?: () => Promise<void> | void } }).persist;
			await persistApi?.rehydrate?.();

			const store = useCartStore.getState();
			store.clearAppliedCoupon?.();
			store.resetCheckoutSession?.();
			// La sucursal va antes que el carrito: el provider vacía el carrito si la
			// sucursal guardada no coincide con la del menú.
			store.setStoredBranchId?.(order.branchId);
			store.setCart?.(cart);
			store.openCart?.();

			router.push(menuPath(order.branchId));
			return true;
		},
		[menuPath, router],
	);

	return { repeatOrder, menuPath };
}
