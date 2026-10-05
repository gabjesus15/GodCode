/**
 * Verificación de los webhooks de PayPal con su API `verify-webhook-signature`.
 *
 * PayPal firma cada aviso con un certificado suyo; en vez de validar la cadena de
 * certificados aquí, se le pregunta a PayPal si la firma corresponde al webhook
 * configurado (`PAYPAL_WEBHOOK_ID`). Sin ese id no se verifica nada: falla cerrado.
 */

const API_BASE = {
	production: "https://api-m.paypal.com",
	sandbox: "https://api-m.sandbox.paypal.com",
} as const;

export type PayPalWebhookVerification =
	| { ok: true }
	| { ok: false; reason: "not_configured" | "missing_headers" | "invalid_signature" | "unavailable" };

const SIGNATURE_HEADERS = {
	auth_algo: "paypal-auth-algo",
	cert_url: "paypal-cert-url",
	transmission_id: "paypal-transmission-id",
	transmission_sig: "paypal-transmission-sig",
	transmission_time: "paypal-transmission-time",
} as const;

export function paypalApiBase(): string {
	return process.env.PAYPAL_ENVIRONMENT === "production" ? API_BASE.production : API_BASE.sandbox;
}

export function getPayPalWebhookId(): string | null {
	return (process.env.PAYPAL_WEBHOOK_ID ?? "").trim() || null;
}

async function getAccessToken(fetchImpl: typeof fetch): Promise<string | null> {
	const clientId = (process.env.PAYPAL_CLIENT_ID ?? "").trim();
	const clientSecret = (process.env.PAYPAL_CLIENT_SECRET ?? "").trim();
	if (!clientId || !clientSecret) return null;
	const res = await fetchImpl(`${paypalApiBase()}/v1/oauth2/token`, {
		method: "POST",
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: "grant_type=client_credentials",
		cache: "no-store",
	});
	if (!res.ok) return null;
	const json = (await res.json().catch(() => ({}))) as { access_token?: string };
	return json.access_token?.trim() || null;
}

/**
 * `rawBody` es el cuerpo tal cual llegó. Se inserta sin re-serializar en
 * `webhook_event`: PayPal calcula la firma sobre esos bytes, y un JSON.stringify
 * de lo parseado puede cambiar números o escapes y dar una firma inválida.
 */
export async function verifyPayPalWebhookSignature(
	rawBody: string,
	headers: Headers,
	fetchImpl: typeof fetch = fetch,
): Promise<PayPalWebhookVerification> {
	const webhookId = getPayPalWebhookId();
	if (!webhookId) return { ok: false, reason: "not_configured" };

	const fields: Record<string, string> = {};
	for (const [field, header] of Object.entries(SIGNATURE_HEADERS)) {
		const value = headers.get(header)?.trim();
		if (!value) return { ok: false, reason: "missing_headers" };
		fields[field] = value;
	}
	try {
		JSON.parse(rawBody);
	} catch {
		return { ok: false, reason: "invalid_signature" };
	}

	try {
		const token = await getAccessToken(fetchImpl);
		if (!token) return { ok: false, reason: "unavailable" };
		const prefix = JSON.stringify({ ...fields, webhook_id: webhookId }).slice(0, -1);
		const res = await fetchImpl(`${paypalApiBase()}/v1/notifications/verify-webhook-signature`, {
			method: "POST",
			headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
			body: `${prefix},"webhook_event":${rawBody}}`,
			cache: "no-store",
		});
		if (!res.ok) return { ok: false, reason: "unavailable" };
		const json = (await res.json().catch(() => ({}))) as { verification_status?: string };
		return json.verification_status === "SUCCESS" ? { ok: true } : { ok: false, reason: "invalid_signature" };
	} catch {
		return { ok: false, reason: "unavailable" };
	}
}

/** Orden de PayPal a la que pertenece una captura (`PAYMENT.CAPTURE.*`). */
export function captureEventOrderId(event: unknown): string | null {
	const resource = (event as { resource?: { supplementary_data?: { related_ids?: { order_id?: unknown } } } })?.resource;
	const orderId = resource?.supplementary_data?.related_ids?.order_id;
	return typeof orderId === "string" && orderId.trim() ? orderId.trim() : null;
}
