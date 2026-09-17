/**
 * Qué se puede hacer con un pedido recién creado desde el menú público.
 *
 * `POST /api/tenant/public-order-delivery` cierra el pedido sin autenticación y los
 * id son correlativos, así que adivinar uno ajeno es trivial. Por eso el parche
 * —y sobre todo la cancelación del pedido que quedó a medias— solo alcanza al
 * pedido que acaba de nacer: pendiente y dentro de la ventana. Un pedido viejo o
 * que ya avanzó se rechaza sin tocarlo; cancelar el de otro sería el abuso, no el
 * arreglo.
 */

/** Ventana en la que el menú puede cerrar el pedido que acaba de crear. */
export const ORDER_PATCH_WINDOW_MS = 10 * 60 * 1000;

export type OrderPatchState = {
	status?: string | null;
	createdAt?: string | Date | null;
};

export type OrderPatchEligibility = "ok" | "expired" | "not_pending";

function createdAtMs(createdAt: OrderPatchState["createdAt"]): number | null {
	if (!createdAt) return null;
	const date = createdAt instanceof Date ? createdAt : new Date(String(createdAt));
	const ms = date.getTime();
	return Number.isFinite(ms) ? ms : null;
}

/**
 * `expired` incluye el pedido con fecha ilegible o nacido "en el futuro": si los
 * relojes de la app y de la base no coinciden, es preferible rechazar el cierre a
 * dejar la puerta abierta sobre un pedido cualquiera.
 */
export function orderPatchEligibility(
	order: OrderPatchState,
	nowMs: number,
	windowMs: number = ORDER_PATCH_WINDOW_MS,
): OrderPatchEligibility {
	const created = createdAtMs(order.createdAt);
	if (created == null) return "expired";
	const age = nowMs - created;
	if (age > windowMs || age < -windowMs) return "expired";
	if (String(order.status ?? "") !== "pending") return "not_pending";
	return "ok";
}

/**
 * El pedido huérfano solo se cancela cuando el parche habría sido legítimo: es el
 * mismo permiso, no uno más amplio.
 */
export function canAutoCancelOrphanOrder(
	order: OrderPatchState,
	nowMs: number,
	windowMs: number = ORDER_PATCH_WINDOW_MS,
): boolean {
	return orderPatchEligibility(order, nowMs, windowMs) === "ok";
}

/** Nota que deja el rastro en el pedido cancelado, para caja y para soporte. */
export function orphanCancelNote(previousNote: string | null | undefined, reason: string): string {
	const marca = `[AUTO-CANCEL] Fallo post-creacion: ${reason || "patch"}`;
	const anterior = String(previousNote ?? "").trim();
	return anterior ? `${anterior}
${marca}` : marca;
}
