"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useCartStore } from "../cart/cart-store";
import { getTenantScopedPath } from "../utils/tenant-route";

import type { MenuAccountOrder } from "./menu-account-types";
import { buildRepeatCartLines, repeatableItems } from "./repeat-order-lines";

export { repeatableItems } from "./repeat-order-lines";

/**
 * "Repetir pedido": reemplaza el carrito por los productos del pedido y abre el menú
 * en la misma sucursal con el carrito abierto. Las líneas las arma `buildRepeatCartLines`.
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
			if (repeatableItems(order).length === 0) return false;

			const cart = buildRepeatCartLines(order);

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
