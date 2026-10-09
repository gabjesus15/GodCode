import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Cobros del SaaS con Mercado Pago (Checkout Pro, API de Preferencias). Hoy solo el alta en
 * Chile: la cuenta de GodCode es chilena y cobra en CLP.
 *
 * Igual que con PayPal, la preferencia la crea siempre el servidor con el monto ya calculado y
 * su `external_reference` (mismo contenido que el `customId` de PayPal) dice qué se pagó.
 * Antes de activar nada se consulta a Mercado Pago la *merchant order* de la preferencia: lo
 * que llega por la URL de regreso o por el webhook solo sirve para saber qué mirar.
 *
 * Se usa la API de Preferencias y no la de Orders: la cuenta de GodCode responde 403 («At
 * least one policy returned UNAUTHORIZED») al crear órdenes de Checkout Pro.
 */

const API_BASE = "https://api.mercadopago.com";
const TIMEOUT_MS = 15_000;
/** Un link de pago abandonado no queda vivo: mañana el monto (o la tasa) puede ser otro. */
const PREFERENCE_TTL_MS = 24 * 60 * 60 * 1000;

/** Estados de pago que no van a cobrarse: si no queda otro, hay que volver a pagar. */
const FAILED_PAYMENT_STATUSES = new Set(["rejected", "cancelled", "refunded", "charged_back"]);
/** Estados de la merchant order que ya no van a cobrarse. */
const FAILED_ORDER_STATUSES = new Set(["expired", "reverted"]);

function accessToken(): string {
	return (process.env.MERCADOPAGO_ACCESS_TOKEN ?? "").trim();
}

export function isMercadoPagoConfigured(): boolean {
	return Boolean(accessToken());
}

/** CLP no tiene decimales: el total en USD se convierte y se redondea al peso. */
export function toClp(amountUsd: number, rate: number): number {
	if (!(amountUsd > 0) || !(rate > 0)) return 0;
	return Math.round(amountUsd * rate);
}

/** Tasa guardada en el super admin («950», «950,5»); `null` si no es un número positivo. */
export function parseUsdClpRate(value: string | null | undefined): number | null {
	const rate = Number(String(value ?? "").trim().replace(",", "."));
	return Number.isFinite(rate) && rate > 0 ? rate : null;
}

/** Merchant order: agrupa los pagos (aprobados, rechazados, en proceso) de una preferencia. */
export type MercadoPagoOrderSnapshot = {
	id: string;
	/** La preferencia que se guardó como pago vigente de la solicitud. */
	preferenceId: string | null;
	orderStatus: string;
	externalReference: string | null;
	currency: string | null;
	/** En la moneda de la cuenta (CLP), redondeado al peso. */
	totalAmount: number;
	paidAmount: number;
	paymentStatuses: string[];
};

export type MercadoPagoOrderState = "paid" | "pending" | "failed";

/**
 * Pagada solo si se cobró el total: un pago parcial o en revisión no activa la cuenta.
 * Fallida si la orden venció o todos sus pagos se rechazaron; sin pagos, sigue pendiente.
 */
export function mercadoPagoOrderState(
	order: Pick<MercadoPagoOrderSnapshot, "orderStatus" | "totalAmount" | "paidAmount" | "paymentStatuses">,
): MercadoPagoOrderState {
	if (order.totalAmount > 0 && order.paidAmount >= order.totalAmount) return "paid";
	if (FAILED_ORDER_STATUSES.has(order.orderStatus.toLowerCase())) return "failed";
	const statuses = order.paymentStatuses.map((status) => status.toLowerCase());
	if (statuses.length > 0 && statuses.every((status) => FAILED_PAYMENT_STATUSES.has(status))) return "failed";
	return "pending";
}

type RawMerchantOrder = {
	id?: number | string;
	preference_id?: string | null;
	order_status?: string | null;
	external_reference?: string | null;
	total_amount?: string | number | null;
	paid_amount?: string | number | null;
	items?: Array<{ currency_id?: string | null }> | null;
	payments?: Array<{ status?: string | null; currency_id?: string | null }> | null;
};

function toPesos(value: string | number | null | undefined): number {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? Math.round(n) : 0;
}

function snapshot(order: RawMerchantOrder): MercadoPagoOrderSnapshot | null {
	if (order.id == null || order.id === "") return null;
	const payments = order.payments ?? [];
	return {
		id: String(order.id),
		preferenceId: order.preference_id ?? null,
		orderStatus: String(order.order_status ?? ""),
		externalReference: order.external_reference ?? null,
		currency: payments.find((payment) => payment.currency_id)?.currency_id ?? order.items?.[0]?.currency_id ?? null,
		totalAmount: toPesos(order.total_amount),
		paidAmount: toPesos(order.paid_amount),
		paymentStatuses: payments.map((payment) => String(payment.status ?? "")),
	};
}

/**
 * La referencia va con `_` en vez del `|` del formato de PayPal (`ob|<solicitud>|…`): así
 * también cabe en APIs que solo aceptan letras, números, `-` y `_`. Los UUID no llevan `_`.
 */
export function toMercadoPagoReference(customId: string): string {
	return customId.replace(/\|/g, "_");
}

/** Devuelve la referencia al formato de PayPal para leerla con `parsePayPalCustomId`. */
export function fromMercadoPagoReference(reference: string | null | undefined): string {
	return String(reference ?? "").replace(/_/g, "|");
}

async function mercadoPagoFetch(path: string, init: RequestInit = {}): Promise<Response> {
	return fetch(`${API_BASE}${path}`, {
		...init,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken()}`,
			...(init.headers ?? {}),
		},
		cache: "no-store",
		signal: AbortSignal.timeout(TIMEOUT_MS),
	});
}

export async function createMercadoPagoPreference(params: {
	amountClp: number;
	title: string;
	externalReference: string;
	/** A dónde vuelve la persona al terminar, pague o no: la ruta consulta el pago y decide. */
	returnUrl: string;
}): Promise<{ ok: true; preferenceId: string; checkoutUrl: string } | { ok: false; error: string }> {
	if (!isMercadoPagoConfigured()) return { ok: false, error: "Mercado Pago no está disponible en este momento." };
	const amount = Math.round(params.amountClp);
	const title = params.title.slice(0, 120);
	// Mercado Pago no acepta el regreso automático hacia direcciones locales (pruebas en localhost).
	const autoReturn = params.returnUrl.startsWith("https://") ? { auto_return: "approved" } : {};
	const now = Date.now();

	try {
		const res = await mercadoPagoFetch("/checkout/preferences", {
			method: "POST",
			body: JSON.stringify({
				items: [{ id: "godcode-alta", title, quantity: 1, unit_price: amount, currency_id: "CLP" }],
				external_reference: params.externalReference,
				back_urls: { success: params.returnUrl, pending: params.returnUrl, failure: params.returnUrl },
				...autoReturn,
				expires: true,
				expiration_date_from: new Date(now).toISOString(),
				expiration_date_to: new Date(now + PREFERENCE_TTL_MS).toISOString(),
				statement_descriptor: "GODCODE",
			}),
		});
		const json = (await res.json().catch(() => ({}))) as { id?: string; init_point?: string; message?: string; cause?: unknown };
		if (!res.ok || !json.id || !json.init_point) {
			// `cause` dice qué campo o permiso rechazó Mercado Pago (no trae credenciales).
			console.error("mercadopago create preference:", res.status, json.message ?? "", JSON.stringify(json.cause ?? null).slice(0, 800));
			return { ok: false, error: "No pudimos iniciar el pago con Mercado Pago." };
		}
		return { ok: true, preferenceId: json.id, checkoutUrl: json.init_point };
	} catch (error) {
		console.error("mercadopago create preference:", error);
		return { ok: false, error: "No pudimos iniciar el pago con Mercado Pago." };
	}
}

/** Estado actual de la merchant order; `null` si no se pudo consultar (reintentar más tarde). */
export async function getMercadoPagoOrder(merchantOrderId: string): Promise<MercadoPagoOrderSnapshot | null> {
	if (!isMercadoPagoConfigured()) return null;
	try {
		const res = await mercadoPagoFetch(`/merchant_orders/${encodeURIComponent(merchantOrderId)}`);
		if (!res.ok) {
			console.error("mercadopago get merchant order:", res.status);
			return null;
		}
		return snapshot((await res.json()) as RawMerchantOrder);
	} catch (error) {
		console.error("mercadopago get merchant order:", error);
		return null;
	}
}

/**
 * Merchant order de un pago (el webhook avisa por pago). `undefined` si Mercado Pago no
 * respondió (reintentar); `null` si el pago no tiene orden.
 */
export async function getMercadoPagoPaymentOrderId(paymentId: string): Promise<string | null | undefined> {
	if (!isMercadoPagoConfigured()) return undefined;
	try {
		const res = await mercadoPagoFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
		if (res.status === 404) return null;
		if (!res.ok) {
			console.error("mercadopago get payment:", res.status);
			return undefined;
		}
		const json = (await res.json()) as { order?: { id?: number | string | null } | null };
		const orderId = json.order?.id;
		return orderId == null || orderId === "" ? null : String(orderId);
	} catch (error) {
		console.error("mercadopago get payment:", error);
		return undefined;
	}
}

/** Ids de merchant order y de pago son numéricos: lo que llega por URL se valida antes de usarlo. */
export function isMercadoPagoNumericId(value: string | null | undefined): value is string {
	return typeof value === "string" && /^\d{1,20}$/.test(value);
}

/** Id de preferencia (`<collector>-<uuid>`). */
export function isMercadoPagoPreferenceId(value: string | null | undefined): value is string {
	return typeof value === "string" && /^[A-Za-z0-9-]{6,100}$/.test(value);
}

export type MercadoPagoSignatureCheck = { ok: true } | { ok: false; reason: "not_configured" | "missing" | "invalid" };

/**
 * Firma del webhook (`x-signature: ts=…,v1=…`): HMAC-SHA256 con la clave secreta de la
 * aplicación sobre `id:<data.id en minúsculas>;request-id:<x-request-id>;ts:<ts>;`.
 * Las partes que no lleguen se omiten del manifest, como indica Mercado Pago.
 */
export function verifyMercadoPagoSignature(params: {
	signatureHeader: string | null;
	requestId: string | null;
	dataId: string | null;
	secret?: string;
}): MercadoPagoSignatureCheck {
	const secret = (params.secret ?? process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "").trim();
	if (!secret) return { ok: false, reason: "not_configured" };

	let ts = "";
	let hash = "";
	for (const part of String(params.signatureHeader ?? "").split(",")) {
		const eq = part.indexOf("=");
		if (eq === -1) continue;
		const key = part.slice(0, eq).trim();
		const value = part.slice(eq + 1).trim();
		if (key === "ts") ts = value;
		if (key === "v1") hash = value;
	}
	if (!ts || !hash) return { ok: false, reason: "missing" };

	const parts: string[] = [];
	const dataId = String(params.dataId ?? "").trim().toLowerCase();
	const requestId = String(params.requestId ?? "").trim();
	if (dataId) parts.push(`id:${dataId}`);
	if (requestId) parts.push(`request-id:${requestId}`);
	parts.push(`ts:${ts}`);
	const manifest = `${parts.join(";")};`;

	const expected = Buffer.from(createHmac("sha256", secret).update(manifest).digest("hex"));
	const received = Buffer.from(hash.toLowerCase());
	return expected.length === received.length && timingSafeEqual(expected, received) ? { ok: true } : { ok: false, reason: "invalid" };
}
