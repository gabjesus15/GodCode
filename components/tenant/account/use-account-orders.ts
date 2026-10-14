"use client";

import { useEffect, useState } from "react";

import type { MenuAccountOrder } from "./menu-account-types";
import { useMenuAccount } from "./use-menu-account";

/** Estados en los que el pedido sigue vivo: el inicio lo muestra con su progreso. */
const ACTIVE_STATUSES = new Set(["pending", "in_progress", "ready"]);

export function isActiveOrder(order: MenuAccountOrder): boolean {
	return ACTIVE_STATUSES.has(order.status);
}

/**
 * Historial de pedidos de la cuenta, pedido una sola vez para todo el panel: el inicio
 * (pedido en curso y recientes) y "Mis pedidos" leen la misma lista.
 */
export function useAccountOrders(companySlug: string) {
	const { pending, errorCode, run } = useMenuAccount("login");
	const [orders, setOrders] = useState<MenuAccountOrder[] | null>(null);

	useEffect(() => {
		let cancelled = false;
		void run<{ orders: MenuAccountOrder[] }>(
			`orders?companySlug=${encodeURIComponent(companySlug)}`,
			{ method: "GET" },
		).then((result) => {
			if (!cancelled && result.ok) setOrders(result.data.orders);
		});
		return () => {
			cancelled = true;
		};
	}, [companySlug, run]);

	return { orders, loading: orders === null && pending, errorCode };
}
