import { NextRequest, NextResponse } from "next/server";

import { applyCompletedPortalPayPalOrder } from "@/lib/billing/portal-paypal";
import { logger } from "@/lib/infra/logger";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { captureEventOrderId, verifyPayPalWebhookSignature } from "@/lib/payments/paypal-webhook";

/** @service-role webhook-signature
 *
 * Avisos de PayPal. Solo se procesa lo que PayPal confirma haber firmado para nuestro
 * webhook (`PAYPAL_WEBHOOK_ID`); sin esa variable responde 503 y no toca nada.
 * `PAYMENT.CAPTURE.COMPLETED` aplica el pedido del portal que la captura no llegó a
 * aplicar, con los mismos controles de importe y pedido que la captura.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** PayPal reintenta todo lo que no sea 2xx: se usa para "todavía no", nunca para un rechazo definitivo. */
function retryLater() {
	return NextResponse.json({ error: "Reintentar más tarde." }, { status: 503 });
}

export async function POST(req: NextRequest) {
	const rawBody = await req.text();
	const verification = await verifyPayPalWebhookSignature(rawBody, req.headers);
	if (!verification.ok) {
		if (verification.reason === "not_configured") {
			logger.error("paypal_webhook_not_configured", { endpoint: "/api/payments/paypal/webhook" });
			return NextResponse.json({ error: "Webhook no configurado." }, { status: 503 });
		}
		if (verification.reason === "unavailable") return retryLater();
		logger.warn("paypal_webhook_invalid_signature", { reason: verification.reason });
		return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
	}

	const event = JSON.parse(rawBody) as { id?: string; event_type?: string };
	if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
		return NextResponse.json({ ok: true, ignored: true });
	}

	const orderId = captureEventOrderId(event);
	if (!orderId) {
		logger.warn("paypal_webhook_without_order", { eventId: event.id });
		return NextResponse.json({ ok: true, ignored: true });
	}

	const result = await applyCompletedPortalPayPalOrder({ supabaseAdmin, orderId });
	if (result.outcome === "retry") return retryLater();
	if (result.outcome === "failed" || result.outcome === "ignored") {
		// `failed` ya dejó ticket para el equipo; reintentar no lo arreglaría.
		logger.warn("paypal_webhook_not_applied", { eventId: event.id, orderId, ...result });
		return NextResponse.json({ ok: true, outcome: result.outcome });
	}
	return NextResponse.json({ ok: true, outcome: result.outcome });
}
