import {
	CheckoutPaymentIntent,
	Client,
	Environment,
	OrdersController,
} from "@paypal/paypal-server-sdk";

/**
 * Cobros del SaaS con PayPal: el alta (onboarding) y los pedidos del portal /cuenta.
 *
 * El `customId` de la orden lo escribe siempre el servidor al crearla y PayPal lo
 * devuelve firmado en la captura: es lo único en lo que se confía para saber qué se
 * pagó. El importe capturado se compara con el que esperaba la solicitud.
 */

export type PayPalOrderMeta =
	| { kind: "onboarding"; applicationId: string; chargedMonths: number; grantedMonths: number }
	| { kind: "portal"; paymentId: string };

const MAX_MONTHS = 12;

function clampMonths(value: unknown, fallback: number): number {
	const n = Math.floor(Number(value));
	return Number.isFinite(n) ? Math.min(MAX_MONTHS + 1, Math.max(1, n)) : fallback;
}

export function encodePayPalCustomId(meta: PayPalOrderMeta): string {
	return meta.kind === "onboarding"
		? `ob|${meta.applicationId}|${meta.chargedMonths}|${meta.grantedMonths}`
		: `pp|${meta.paymentId}`;
}

/** Lee el `customId`; acepta el formato antiguo `<solicitud>|<meses>` de órdenes ya creadas. */
export function parsePayPalCustomId(customId: string | null | undefined): PayPalOrderMeta | null {
	const parts = String(customId ?? "").split("|").map((part) => part.trim());
	if (parts[0] === "ob" && parts[1]) {
		const charged = clampMonths(parts[2], 1);
		return { kind: "onboarding", applicationId: parts[1], chargedMonths: charged, grantedMonths: clampMonths(parts[3], charged) };
	}
	if (parts[0] === "pp" && parts[1]) {
		return { kind: "portal", paymentId: parts[1] };
	}
	if (parts.length === 2 && parts[0]) {
		const months = clampMonths(parts[1], 1);
		return { kind: "onboarding", applicationId: parts[0], chargedMonths: months, grantedMonths: months };
	}
	return null;
}

/** Importes en centavos para comparar sin errores de coma flotante. */
export function toCents(amount: number | string | null | undefined): number {
	return Math.round(Number(amount ?? 0) * 100);
}

function getOrdersController(): OrdersController | null {
	const clientId = (process.env.PAYPAL_CLIENT_ID ?? "").trim();
	const clientSecret = (process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
	if (!clientId || !clientSecret) return null;
	const client = new Client({
		clientCredentialsAuthCredentials: { oAuthClientId: clientId, oAuthClientSecret: clientSecret },
		environment: process.env.PAYPAL_ENVIRONMENT === "production" ? Environment.Production : Environment.Sandbox,
	});
	return new OrdersController(client);
}

export function isPayPalConfigured(): boolean {
	return Boolean((process.env.PAYPAL_CLIENT_ID ?? "").trim() && (process.env.PAYPAL_CLIENT_SECRET ?? "").trim());
}

export async function createPayPalOrder(params: {
	amountUsd: number;
	description: string;
	meta: PayPalOrderMeta;
	/**
	 * Identificador único de lo que se cobra. PayPal rechaza una segunda captura con el
	 * mismo `invoiceId` (con el bloqueo de pagos duplicados de la cuenta, activo por
	 * defecto): dos pestañas no pueden pagar dos veces el mismo pedido.
	 */
	invoiceId?: string;
	returnUrl?: string;
	cancelUrl?: string;
}): Promise<{ ok: true; orderId: string; approveUrl: string | null } | { ok: false; error: string }> {
	const orders = getOrdersController();
	if (!orders) return { ok: false, error: "PayPal no está disponible en este momento." };

	try {
		const res = await orders.createOrder({
			body: {
				intent: CheckoutPaymentIntent.Capture,
				purchaseUnits: [
					{
						customId: encodePayPalCustomId(params.meta),
						...(params.invoiceId ? { invoiceId: params.invoiceId.slice(0, 127) } : {}),
						amount: { currencyCode: "USD", value: params.amountUsd.toFixed(2) },
						description: params.description.slice(0, 127),
					},
				],
				...(params.returnUrl && params.cancelUrl
					? { applicationContext: { returnUrl: params.returnUrl, cancelUrl: params.cancelUrl } }
					: {}),
			},
		});
		const orderId = res.result?.id;
		if (!orderId) return { ok: false, error: "PayPal no devolvió la orden." };
		const approveUrl =
			res.result?.links?.find((link) => link.rel === "approve" || link.rel === "payer-action")?.href ?? null;
		return { ok: true, orderId, approveUrl };
	} catch (error) {
		console.error("paypal create order:", error);
		return { ok: false, error: "No pudimos iniciar el pago con PayPal." };
	}
}

export type PayPalOrderSnapshot = {
	status: string | null;
	meta: PayPalOrderMeta | null;
	amountCents: number;
	currency: string | null;
	payerEmail: string | null;
	payerId: string | null;
};

type RawOrder = {
	status?: string;
	purchaseUnits?: Array<{
		customId?: string;
		amount?: { value?: string; currencyCode?: string };
		payments?: { captures?: Array<{ amount?: { value?: string; currencyCode?: string } }> };
	}>;
	payer?: { emailAddress?: string; payerId?: string };
};

function snapshotFromOrder(order: RawOrder | undefined): PayPalOrderSnapshot {
	const unit = order?.purchaseUnits?.[0];
	const captured = unit?.payments?.captures?.[0]?.amount;
	const amount = captured ?? unit?.amount;
	return {
		status: order?.status ?? null,
		meta: parsePayPalCustomId(unit?.customId),
		amountCents: toCents(amount?.value),
		currency: amount?.currencyCode ?? null,
		payerEmail: order?.payer?.emailAddress ?? null,
		payerId: order?.payer?.payerId ?? null,
	};
}

/** Estado de la orden sin capturarla (para verificarla antes de cobrar). */
export async function getPayPalOrder(orderId: string): Promise<PayPalOrderSnapshot | null> {
	const orders = getOrdersController();
	if (!orders) return null;
	try {
		const res = await orders.getOrder({ id: orderId });
		return snapshotFromOrder(res.result as RawOrder);
	} catch (error) {
		console.error("paypal get order:", error);
		return null;
	}
}

/** Captura la orden. Si ya estaba capturada, devuelve su estado actual. */
export async function capturePayPalOrder(orderId: string): Promise<PayPalOrderSnapshot | null> {
	const orders = getOrdersController();
	if (!orders) return null;
	try {
		const res = await orders.captureOrder({ id: orderId });
		return snapshotFromOrder(res.result as RawOrder);
	} catch (error) {
		// ORDER_ALREADY_CAPTURED y similares: se consulta y se decide con el estado real.
		console.error("paypal capture order:", error);
		return getPayPalOrder(orderId);
	}
}
