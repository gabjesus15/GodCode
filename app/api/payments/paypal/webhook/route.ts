import { NextRequest, NextResponse } from "next/server";

import { applyCompletedPortalPayPalOrder } from "@/lib/billing/portal-paypal";
import { logger } from "@/lib/infra/logger";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { applyOnboardingPayPalWebhook } from "@/lib/onboarding/paypal-onboarding";
import { approvedEventOrderId, captureEventOrderId, verifyPayPalWebhookSignature } from "@/lib/payments/paypal-webhook";

/** @service-role webhook-signature
 *
 * Avisos de PayPal. Solo se procesa lo que PayPal confirma haber firmado para nuestro
 * webhook (`PAYPAL_WEBHOOK_ID`); sin esa variable responde 503 y no toca nada.
 * `PAYMENT.CAPTURE.COMPLETED` aplica el pedido del portal (o cierra el alta) que la
 * captura no llegó a aplicar, con los mismos controles de importe y pedido que la captura.
 * `CHECKOUT.ORDER.APPROVED` cobra la orden del alta de quien aprobó en PayPal y cerró la
 * pestaña antes de volver: sin esto la orden quedaba aprobada, sin cobrar y sin cuenta.
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
	if (event.event_type === "CHECKOUT.ORDER.APPROVED") {
		const orderId = approvedEventOrderId(event);
		if (!orderId) return NextResponse.json({ ok: true, ignored: true });
		return respondOnboarding(event.id, orderId);
	}
	if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
		return NextResponse.json({ ok: true, ignored: true });
	}

	const orderId = captureEventOrderId(event);
	if (!orderId) {
		logger.warn("paypal_webhook_without_order", { eventId: event.id });
		return NextResponse.json({ ok: true, ignored: true });
	}

	const result = await applyCompletedPortalPayPalOrder({ supabaseAdmin, orderId });
	if (result.outcome === "ignored" && result.reason === "not_portal_order") {
		return respondOnboarding(event.id, orderId);
	}
	if (result.outcome === "retry") return retryLater();
	if (result.outcome === "failed" || result.outcome === "ignored") {
		// `failed` ya dejó ticket para el equipo; reintentar no lo arreglaría.
		logger.warn("paypal_webhook_not_applied", { eventId: event.id, orderId, ...result });
		return NextResponse.json({ ok: true, outcome: result.outcome });
	}
	return NextResponse.json({ ok: true, outcome: result.outcome });
}

async function respondOnboarding(eventId: string | undefined, orderId: string) {
	const result = await applyOnboardingPayPalWebhook({ supabaseAdmin, orderId });
	if (result.outcome === "retry") return retryLater();
	if (result.outcome !== "applied") {
		// `failed` ya avisó al equipo por Telegram y el barrido lo sigue reintentando.
		logger.warn("paypal_webhook_onboarding_not_applied", { eventId, orderId, ...result });
	}
	return NextResponse.json({ ok: true, outcome: result.outcome });
}
