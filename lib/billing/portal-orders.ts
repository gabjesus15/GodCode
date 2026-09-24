/**
 * Pedidos de pago del portal (/cuenta). Todo lo que el dueño compra deja una fila en
 * `payments_history` que después paga con PayPal o con un comprobante.
 *
 * Estados:
 * - `pending`: creado, falta pagarlo.
 * - `pending_validation`: comprobante enviado; lo revisa el equipo.
 * - `paid`: pagado y aplicado.
 * - `rejected`: el equipo rechazó el comprobante; puede enviar otro o pagar con PayPal.
 * - `cancelled`: el dueño lo anuló sin pagarlo.
 *
 * La referencia dice qué se compra: `PLANCHG-` (subir de plan), `RENEW-` (renovar),
 * `ADDON-<id>-M<n>-` (extra) y `CUST-` (sucursales extra).
 */

export type PortalPaymentKind = "plan_change" | "renewal" | "addon" | "branch_expansion";

export const OPEN_ORDER_STATUSES = ["pending", "pending_validation", "rejected"] as const;

export type PortalOrderLike = {
	status: string | null;
	payment_reference: string | null;
	reference_file_url?: string | null;
};

export function classifyPortalPaymentReference(
	reference: string | null | undefined,
): { kind: PortalPaymentKind; addonId?: string } | null {
	const ref = String(reference ?? "");
	if (ref.startsWith("PLANCHG-")) return { kind: "plan_change" };
	if (ref.startsWith("RENEW-")) return { kind: "renewal" };
	if (ref.startsWith("CUST-")) return { kind: "branch_expansion" };
	const addon = ref.match(/^ADDON-([0-9a-f-]{36})-M\d+-/i);
	if (addon) return { kind: "addon", addonId: addon[1].toLowerCase() };
	return null;
}

function normalizedStatus(status: string | null | undefined): string {
	return String(status ?? "").trim().toLowerCase();
}

export function isOpenOrder(order: PortalOrderLike): boolean {
	return (
		classifyPortalPaymentReference(order.payment_reference) != null &&
		(OPEN_ORDER_STATUSES as readonly string[]).includes(normalizedStatus(order.status))
	);
}

/**
 * Se puede pagar (o anular) mientras nadie lo esté revisando. Un `pending_validation` sin
 * comprobante es un pedido creado cuando la base todavía no aceptaba `pending`.
 */
export function isOrderAwaitingPayment(order: PortalOrderLike): boolean {
	const status = normalizedStatus(order.status);
	if (status === "pending" || status === "rejected") return true;
	return status === "pending_validation" && !String(order.reference_file_url ?? "").trim();
}

/** Renovar y cambiar de plan tocan lo mismo (plan y vencimiento): solo uno abierto a la vez. */
export function isSubscriptionOrderKind(kind: PortalPaymentKind | undefined | null): boolean {
	return kind === "plan_change" || kind === "renewal";
}

export function describePortalOrder(
	order: PortalOrderLike & { plan_id?: string | null; months_paid?: number | null },
	names: { plan?: (id: string) => string | null | undefined; addon?: (id: string) => string | null | undefined } = {},
): string {
	const kind = classifyPortalPaymentReference(order.payment_reference);
	const planName = order.plan_id ? names.plan?.(order.plan_id) : null;
	switch (kind?.kind) {
		case "plan_change":
			return planName ? `Cambio al plan ${planName}` : "Cambio de plan";
		case "renewal": {
			const months = Math.max(1, Number(order.months_paid ?? 1) || 1);
			const period = `${months} ${months === 1 ? "mes" : "meses"}`;
			return planName ? `Renovación ${planName} · ${period}` : `Renovación · ${period}`;
		}
		case "addon": {
			const addonName = kind.addonId ? names.addon?.(kind.addonId) : null;
			return addonName ? `Extra: ${addonName}` : "Servicio extra";
		}
		case "branch_expansion":
			return "Sucursales extra";
		default:
			return "Pago de suscripción";
	}
}
