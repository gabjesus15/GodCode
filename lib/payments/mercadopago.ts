import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * Cobros del SaaS con Mercado Pago (Checkout Pro, Orders API). Hoy solo el alta en Chile:
 * la cuenta de GodCode es chilena y cobra en CLP.
 *
 * Igual que con PayPal, la orden la crea siempre el servidor con el monto ya calculado y su
 * `external_reference` (mismo formato que el `customId` de PayPal) dice qué se pagó. Antes
 * de activar nada se vuelve a consultar la orden a Mercado Pago: lo que llega por la URL de
 * regreso o por el webhook solo sirve para saber qué orden mirar.
 */

const API_BASE = "https://api.mercadopago.com";
const TIMEOUT_MS = 15_000;

/** Estados de la orden que ya no van a cobrarse (hay que volver a pagar). */
const FAILED_ORDER_STATUSES = new Set(["failed", "canceled", "cancelled", "expired", "refunded", "charged_back"]);

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

export type MercadoPagoOrderSnapshot = {
	id: string;
	status: string;
	statusDetail: string;
	externalReference: string | null;
	currency: string | null;
	/** En la moneda de la cuenta (CLP), redondeado al peso. */
	totalAmount: number;
	totalPaidAmount: number;
};

export type MercadoPagoOrderState = "paid" | "pending" | "failed";

/**
 * Pagada solo si Mercado Pago la procesó y se cobró el total: un pago parcial o en
 * revisión no activa la cuenta.
 */
export function mercadoPagoOrderState(order: Pick<MercadoPagoOrderSnapshot, "status" | "statusDetail" | "totalAmount" | "totalPaidAmount">): MercadoPagoOrderState {
	const status = order.status.toLowerCase();
	if (status === "processed" && order.totalAmount > 0 && order.totalPaidAmount >= order.totalAmount) return "paid";
	if (FAILED_ORDER_STATUSES.has(status)) return "failed";
	return "pending";
}

type RawOrder = {
	id?: string;
	status?: string;
	status_detail?: string;
	external_reference?: string | null;
	currency?: string | null;
	total_amount?: string | number | null;
	total_paid_amount?: string | number | null;
	checkout_url?: string | null;
};

function toPesos(value: string | number | null | undefined): number {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? Math.round(n) : 0;
}

function snapshot(order: RawOrder): MercadoPagoOrderSnapshot | null {
	if (!order.id) return null;
	return {
		id: order.id,
		status: String(order.status ?? ""),
		statusDetail: String(order.status_detail ?? ""),
		externalReference: order.external_reference ?? null,
		currency: order.currency ?? null,
		totalAmount: toPesos(order.total_amount),
		totalPaidAmount: toPesos(order.total_paid_amount),
	};
}

const REFERENCE_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * `external_reference` solo admite letras, números, `-` y `_` (máx. 64): el `|` del formato
 * de PayPal (`ob|<solicitud>|…`) pasa a `_`. Los ids de solicitud (UUID) no llevan `_`.
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

export async function createMercadoPagoOrder(params: {
	amountClp: number;
	title: string;
	externalReference: string;
	/** A dónde vuelve la persona al terminar, pague o no: la ruta consulta la orden y decide. */
	returnUrl: string;
}): Promise<{ ok: true; orderId: string; checkoutUrl: string } | { ok: false; error: string }> {
	if (!isMercadoPagoConfigured()) return { ok: false, error: "Mercado Pago no está disponible en este momento." };
	if (!REFERENCE_PATTERN.test(params.externalReference)) {
		console.error("mercadopago create order: external_reference inválida");
		return { ok: false, error: "No pudimos iniciar el pago con Mercado Pago." };
	}
	const amount = String(Math.round(params.amountClp));
	const title = params.title.slice(0, 120);
	// Mercado Pago no acepta el regreso automático hacia direcciones locales (pruebas en localhost).
	const autoReturn = params.returnUrl.startsWith("https://") ? { auto_return: "all" } : {};

	try {
		const res = await mercadoPagoFetch("/v1/orders", {
			method: "POST",
			headers: { "X-Idempotency-Key": randomUUID() },
			body: JSON.stringify({
				type: "online",
				processing_mode: "manual",
				total_amount: amount,
				external_reference: params.externalReference,
				description: title,
				// Un link de pago abandonado no queda vivo: mañana el monto (o la tasa) puede ser otro.
				expiration_time: "P1D",
				items: [{ title, unit_price: amount, quantity: 1 }],
				config: {
					online: {
						success_url: params.returnUrl,
						pending_url: params.returnUrl,
						failure_url: params.returnUrl,
						...autoReturn,
					},
				},
			}),
		});
		const json = (await res.json().catch(() => ({}))) as RawOrder & { message?: string; errors?: unknown };
		if (!res.ok || !json.id || !json.checkout_url) {
			// El detalle de `errors` dice qué campo o permiso rechazó Mercado Pago (no trae credenciales).
			console.error("mercadopago create order:", res.status, json.message ?? "", JSON.stringify(json.errors ?? null).slice(0, 800));
			return { ok: false, error: "No pudimos iniciar el pago con Mercado Pago." };
		}
		return { ok: true, orderId: json.id, checkoutUrl: json.checkout_url };
	} catch (error) {
		console.error("mercadopago create order:", error);
		return { ok: false, error: "No pudimos iniciar el pago con Mercado Pago." };
	}
}

/** Estado actual de la orden; `null` si no se pudo consultar (reintentar más tarde). */
export async function getMercadoPagoOrder(orderId: string): Promise<MercadoPagoOrderSnapshot | null> {
	if (!isMercadoPagoConfigured()) return null;
	try {
		const res = await mercadoPagoFetch(`/v1/orders/${encodeURIComponent(orderId)}`);
		if (!res.ok) {
			console.error("mercadopago get order:", res.status);
			return null;
		}
		return snapshot((await res.json()) as RawOrder);
	} catch (error) {
		console.error("mercadopago get order:", error);
		return null;
	}
}

/** Formato de un id de orden de Mercado Pago (`ORD01…`): lo que llega por URL se valida antes de usarlo. */
export function isMercadoPagoOrderId(value: string | null | undefined): value is string {
	return typeof value === "string" && /^[A-Za-z0-9]{6,64}$/.test(value);
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
