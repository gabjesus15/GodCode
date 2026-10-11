import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Cobros del SaaS con Mercado Pago (Checkout Pro, API de Preferencias). Hoy solo el alta en
 * Chile: la cuenta de GodCode es chilena y cobra en CLP.
 *
 * Igual que con PayPal, la preferencia la crea siempre el servidor con el monto ya calculado y
 * su `external_reference` (mismo contenido que el `customId` de PayPal, más un sufijo único)
 * dice qué se pagó. Antes de activar nada se consulta el *pago* a Mercado Pago: lo que llega
 * por la URL de regreso o por el webhook solo sirve para saber qué mirar.
 *
 * Solo se leen pagos (`/v1/payments`): la cuenta de GodCode responde 403 («At least one policy
 * returned UNAUTHORIZED») al crear órdenes (API de Orders) y al leer preferencias o merchant
 * orders.
 */

const API_BASE = "https://api.mercadopago.com";
const TIMEOUT_MS = 15_000;
/** Un link de pago abandonado no queda vivo: mañana el monto (o la tasa) puede ser otro. */
const PREFERENCE_TTL_MS = 24 * 60 * 60 * 1000;

/** Estados de pago que no van a cobrarse: hay que volver a pagar. */
const FAILED_PAYMENT_STATUSES = new Set(["rejected", "cancelled", "refunded", "charged_back"]);

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

/** Lo que se lee de un pago para decidir si el alta se cierra. */
export type MercadoPagoPaymentSnapshot = {
	id: string;
	status: string;
	externalReference: string | null;
	currency: string | null;
	/** Lo cobrado, en pesos. */
	amount: number;
	/** Total de los ítems de la preferencia que se pagó, en pesos. */
	itemsTotal: number;
};

export type MercadoPagoPaymentState = "paid" | "pending" | "failed";

/** Solo `approved` es cobro; en proceso o autorizado sin capturar sigue pendiente. */
export function mercadoPagoPaymentState(payment: Pick<MercadoPagoPaymentSnapshot, "status">): MercadoPagoPaymentState {
	const status = payment.status.toLowerCase();
	if (status === "approved") return "paid";
	if (FAILED_PAYMENT_STATUSES.has(status)) return "failed";
	return "pending";
}

type RawPayment = {
	id?: number | string;
	status?: string | null;
	external_reference?: string | null;
	currency_id?: string | null;
	transaction_amount?: string | number | null;
	additional_info?: { items?: Array<{ unit_price?: string | number | null; quantity?: string | number | null }> | null } | null;
};

function toPesos(value: string | number | null | undefined): number {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? Math.round(n) : 0;
}

function paymentSnapshot(payment: RawPayment): MercadoPagoPaymentSnapshot | null {
	if (payment.id == null || payment.id === "") return null;
	const items = payment.additional_info?.items ?? [];
	return {
		id: String(payment.id),
		status: String(payment.status ?? ""),
		externalReference: payment.external_reference ?? null,
		currency: payment.currency_id ?? null,
		amount: toPesos(payment.transaction_amount),
		itemsTotal: items.reduce((sum, item) => sum + toPesos(item.unit_price) * (Number(item.quantity) || 1), 0),
	};
}

/**
 * La referencia va con `_` en vez del `|` del formato de PayPal (`ob|<solicitud>|…`): así
 * también cabe en APIs que solo aceptan letras, números, `-` y `_`. Los UUID no llevan `_`.
 */
export function toMercadoPagoReference(customId: string): string {
	return customId.replace(/\|/g, "_");
}

/**
 * Referencia de un checkout: la del alta más un sufijo al azar, que la hace única. Se guarda
 * como `payment_reference` de la solicitud y es lo que dice cuál es el pago vigente: el pago
 * no trae el id de la preferencia, y la cuenta no puede leer preferencias ni merchant orders
 * (403 de Mercado Pago). Cabe en los 64 caracteres que acepta `external_reference`.
 */
export function newMercadoPagoCheckoutReference(customId: string): string {
	return `${toMercadoPagoReference(customId)}_${randomBytes(5).toString("hex")}`;
}

/** Referencia de un checkout de Mercado Pago del alta (`ob_<solicitud>_…`). */
export function isMercadoPagoCheckoutReference(value: string | null | undefined): value is string {
	return typeof value === "string" && /^ob_[A-Za-z0-9_-]{1,61}$/.test(value);
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

/**
 * Estado actual de un pago. `undefined` si Mercado Pago no respondió (reintentar más tarde);
 * `null` si el pago no existe o no es de esta cuenta.
 */
export async function getMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPaymentSnapshot | null | undefined> {
	if (!isMercadoPagoConfigured()) return undefined;
	try {
		const res = await mercadoPagoFetch(`/v1/payments/${encodeURIComponent(paymentId)}`);
		if (res.status === 404) return null;
		if (!res.ok) {
			console.error("mercadopago get payment:", res.status);
			return undefined;
		}
		return paymentSnapshot((await res.json()) as RawPayment);
	} catch (error) {
		console.error("mercadopago get payment:", error);
		return undefined;
	}
}

/** Pagos de un checkout, del más nuevo al más viejo; `null` si Mercado Pago no respondió. */
export async function findMercadoPagoPaymentsByReference(externalReference: string): Promise<MercadoPagoPaymentSnapshot[] | null> {
	if (!isMercadoPagoConfigured()) return null;
	try {
		const query = new URLSearchParams({ external_reference: externalReference, sort: "date_created", criteria: "desc", limit: "10" });
		const res = await mercadoPagoFetch(`/v1/payments/search?${query.toString()}`);
		if (!res.ok) {
			console.error("mercadopago search payments:", res.status);
			return null;
		}
		const json = (await res.json()) as { results?: RawPayment[] | null };
		return (json.results ?? []).map(paymentSnapshot).filter((payment): payment is MercadoPagoPaymentSnapshot => payment != null);
	} catch (error) {
		console.error("mercadopago search payments:", error);
		return null;
	}
}

/** Los ids de pago son numéricos: lo que llega por URL o por el webhook se valida antes de usarlo. */
export function isMercadoPagoNumericId(value: string | null | undefined): value is string {
	return typeof value === "string" && /^\d{1,20}$/.test(value);
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
