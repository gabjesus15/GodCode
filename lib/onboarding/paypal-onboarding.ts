import type { SupabaseClient } from "@supabase/supabase-js";

import { capturePayPalOrder, getPayPalOrder, toCents } from "@/lib/payments/paypal";
import { completeOnboardingPayment } from "./complete-onboarding-payment";
import { hashPaymentIdentity, normalizeEmail } from "./trial-eligibility";

export type CaptureOnboardingOrderResult = { ok: true; ref: string } | { ok: false; error: string; status: number };

/**
 * Cobra una orden de PayPal del onboarding y cierra el alta.
 *
 * Antes de capturar se comprueba que la orden sea la vigente de la solicitud (si el
 * cliente cambió de plan o de método, la orden vieja ya no vale) y que el importe sea el
 * que calculó el servidor. Así una orden creada para un plan barato no puede dar de alta
 * uno caro. La usan el botón de PayPal (POST) y el regreso por redirección (GET).
 */
export async function captureOnboardingPayPalOrder(params: {
	supabaseAdmin: SupabaseClient;
	orderId: string;
	/** Token de verificación de la solicitud, si la petición lo trae (el botón lo manda). */
	verificationToken?: string | null;
}): Promise<CaptureOnboardingOrderResult> {
	const { supabaseAdmin, orderId } = params;

	const order = await getPayPalOrder(orderId);
	if (!order) return { ok: false, error: "No pudimos consultar el pago en PayPal.", status: 502 };
	if (order.meta?.kind !== "onboarding") {
		return { ok: false, error: "La orden de PayPal no corresponde a un registro.", status: 400 };
	}

	const { data: app } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,payment_reference,payment_amount,verification_token")
		.eq("id", order.meta.applicationId)
		.maybeSingle();
	if (!app) return { ok: false, error: "Solicitud no encontrada", status: 404 };

	const token = params.verificationToken?.trim();
	if (token && String(app.verification_token ?? "") !== token) {
		return { ok: false, error: "Este pago no corresponde a tu solicitud.", status: 403 };
	}
	if (String(app.payment_reference ?? "") !== orderId) {
		return {
			ok: false,
			error: "Esta orden ya no es la vigente (cambiaste el plan o el método de pago). Vuelve a pagar desde el último paso.",
			status: 409,
		};
	}

	const expectedCents = toCents(app.payment_amount);
	const amountMatches = (cents: number, currency: string | null) =>
		expectedCents > 0 && cents === expectedCents && (currency ?? "USD") === "USD";
	if (!amountMatches(order.amountCents, order.currency)) {
		return { ok: false, error: "El importe de la orden no coincide con tu plan. Vuelve a pagar.", status: 409 };
	}

	const captured = order.status === "COMPLETED" ? order : await capturePayPalOrder(orderId);
	if (!captured || captured.status !== "COMPLETED") {
		return { ok: false, error: "PayPal todavía no confirma el pago.", status: 409 };
	}
	if (!amountMatches(captured.amountCents, captured.currency)) {
		return { ok: false, error: "El importe cobrado no coincide. Escríbenos a soporte.", status: 409 };
	}

	const result = await completeOnboardingPayment({
		supabaseAdmin,
		applicationId: app.id,
		paymentReference: orderId,
		amountPaid: captured.amountCents / 100,
		methodSlug: "paypal",
		methodName: "PayPal",
		chargedMonths: order.meta.chargedMonths,
		grantedMonths: order.meta.grantedMonths,
		promoApplied: order.meta.grantedMonths > order.meta.chargedMonths,
		isManualPayment: false,
		payerEmailNormalized: normalizeEmail(captured.payerEmail) || null,
		paypalPayerIdHash: captured.payerId ? hashPaymentIdentity(captured.payerId) : null,
	});

	if (!result.ok) return { ok: false, error: result.error, status: result.status };
	return { ok: true, ref: orderId };
}
