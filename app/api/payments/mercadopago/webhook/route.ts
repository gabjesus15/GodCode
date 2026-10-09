import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/infra/logger";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { captureOnboardingMercadoPagoOrder } from "@/lib/onboarding/mercadopago-onboarding";
import { isMercadoPagoOrderId, verifyMercadoPagoSignature } from "@/lib/payments/mercadopago";

/** @service-role webhook-signature
 *
 * Avisos de Mercado Pago (tópico `order`). Solo se procesa lo firmado con la clave secreta
 * de la aplicación (`MERCADOPAGO_WEBHOOK_SECRET`); sin esa variable responde 503 y no toca
 * nada. La orden se vuelve a consultar a Mercado Pago y se cierra el alta con los mismos
 * controles que el regreso del checkout, así que se activa aunque la persona cierre la pestaña.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mercado Pago reintenta todo lo que no sea 2xx: se usa para «todavía no», nunca para un rechazo definitivo. */
function retryLater() {
	return NextResponse.json({ error: "Reintentar más tarde." }, { status: 503 });
}

export async function POST(req: NextRequest) {
	const rawBody = await req.text();
	const event = (() => {
		try {
			return JSON.parse(rawBody) as { type?: string; action?: string; data?: { id?: string } };
		} catch {
			return {} as { type?: string; action?: string; data?: { id?: string } };
		}
	})();
	// La firma usa el `data.id` de la URL; el del cuerpo solo de respaldo.
	const dataId = req.nextUrl.searchParams.get("data.id") ?? event.data?.id ?? null;

	const signature = verifyMercadoPagoSignature({
		signatureHeader: req.headers.get("x-signature"),
		requestId: req.headers.get("x-request-id"),
		dataId,
	});
	if (!signature.ok) {
		if (signature.reason === "not_configured") {
			logger.error("mercadopago_webhook_not_configured", { endpoint: "/api/payments/mercadopago/webhook" });
			return NextResponse.json({ error: "Webhook no configurado." }, { status: 503 });
		}
		logger.warn("mercadopago_webhook_invalid_signature", { reason: signature.reason });
		return NextResponse.json({ error: "Firma inválida." }, { status: 401 });
	}

	const type = req.nextUrl.searchParams.get("type") ?? event.type;
	if (type !== "order" || !isMercadoPagoOrderId(dataId)) {
		return NextResponse.json({ ok: true, ignored: true });
	}

	const result = await captureOnboardingMercadoPagoOrder({ supabaseAdmin, orderId: dataId });
	if (result.ok) return NextResponse.json({ ok: true, outcome: "applied" });
	// Aún no cobrada o Mercado Pago no respondió: llegará otro aviso, o este se reintenta.
	if (result.reason === "pending" && result.status >= 500) return retryLater();
	logger.warn("mercadopago_webhook_not_applied", { orderId: dataId, action: event.action, reason: result.reason });
	return NextResponse.json({ ok: true, outcome: result.reason });
}
