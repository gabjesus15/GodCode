import type { SupabaseClient } from "@supabase/supabase-js";

import { capturePayPalOrder, getPayPalOrder, toCents } from "@/lib/payments/paypal";
import { completeOnboardingPayment } from "./complete-onboarding-payment";
import { alertOnboardingTeam } from "./team-alerts";
import { hashPaymentIdentity, normalizeEmail } from "./trial-eligibility";

/**
 * Por qué no se cerró el alta. `charged_*` significa que PayPal ya cobró: el cliente
 * pagó y no tiene cuenta, así que alguien del equipo tiene que enterarse.
 */
export type CaptureOnboardingFailure =
	| "paypal_unavailable"
	| "not_onboarding"
	| "not_found"
	| "forbidden"
	| "stale_order"
	| "amount_mismatch"
	| "not_completed"
	| "charged_amount_mismatch"
	| "charged_not_applied";

export type CaptureOnboardingOrderResult =
	| { ok: true; ref: string }
	| { ok: false; error: string; status: number; code: CaptureOnboardingFailure; businessName?: string | null; email?: string | null };

export function isChargedFailure(code: CaptureOnboardingFailure): boolean {
	return code === "charged_amount_mismatch" || code === "charged_not_applied";
}

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
	if (!order) return { ok: false, error: "No pudimos consultar el pago en PayPal.", status: 502, code: "paypal_unavailable" };
	if (order.meta?.kind !== "onboarding") {
		return { ok: false, error: "La orden de PayPal no corresponde a un registro.", status: 400, code: "not_onboarding" };
	}

	const { data: app } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,payment_reference,payment_amount,verification_token,business_name,email")
		.eq("id", order.meta.applicationId)
		.maybeSingle();
	if (!app) return { ok: false, error: "Solicitud no encontrada", status: 404, code: "not_found" };
	const who = { businessName: (app.business_name as string | null) ?? null, email: (app.email as string | null) ?? null };

	const token = params.verificationToken?.trim();
	if (token && String(app.verification_token ?? "") !== token) {
		return { ok: false, error: "Este pago no corresponde a tu solicitud.", status: 403, code: "forbidden" };
	}
	if (String(app.payment_reference ?? "") !== orderId) {
		return {
			ok: false,
			error: "Esta orden ya no es la vigente (cambiaste el plan o el método de pago). Vuelve a pagar desde el último paso.",
			status: 409,
			code: "stale_order",
			...who,
		};
	}

	const expectedCents = toCents(app.payment_amount);
	const amountMatches = (cents: number, currency: string | null) =>
		expectedCents > 0 && cents === expectedCents && (currency ?? "USD") === "USD";
	if (!amountMatches(order.amountCents, order.currency)) {
		return { ok: false, error: "El importe de la orden no coincide con tu plan. Vuelve a pagar.", status: 409, code: "amount_mismatch", ...who };
	}

	const captured = order.status === "COMPLETED" ? order : await capturePayPalOrder(orderId);
	if (!captured || captured.status !== "COMPLETED") {
		return { ok: false, error: "PayPal todavía no confirma el pago.", status: 409, code: "not_completed", ...who };
	}
	if (!amountMatches(captured.amountCents, captured.currency)) {
		return { ok: false, error: "El importe cobrado no coincide. Escríbenos a soporte.", status: 409, code: "charged_amount_mismatch", ...who };
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
		// Con cupón de meses gratis se otorga más de lo pagado sin que haya promo: el dato
		// viene explícito en la orden (las órdenes viejas lo deducen al leerse).
		promoApplied: order.meta.promoApplied ?? order.meta.grantedMonths > order.meta.chargedMonths,
		isManualPayment: false,
		payerEmailNormalized: normalizeEmail(captured.payerEmail) || null,
		paypalPayerIdHash: captured.payerId ? hashPaymentIdentity(captured.payerId) : null,
	});

	// Otra vía (el botón, el regreso de PayPal o el webhook) lo está cerrando ahora mismo:
	// la página de éxito espera a que termine.
	if (!result.ok && result.inProgress) return { ok: true, ref: orderId };
	if (!result.ok) {
		return {
			ok: false,
			error: "Recibimos tu pago, pero no pudimos terminar de crear tu cuenta. Ya avisamos al equipo: lo resolvemos y te escribimos.",
			status: result.status,
			code: "charged_not_applied",
			...who,
		};
	}
	return { ok: true, ref: orderId };
}

/** Aviso al equipo de un cobro de PayPal que no terminó en cuenta. Nunca lanza. */
export async function alertChargedOnboardingFailure(
	orderId: string,
	result: Extract<CaptureOnboardingOrderResult, { ok: false }>,
	source: string,
): Promise<void> {
	if (!isChargedFailure(result.code)) return;
	await alertOnboardingTeam({
		kind: "needs_attention",
		businessName: result.businessName ?? "",
		email: result.email ?? null,
		problem:
			result.code === "charged_amount_mismatch"
				? "PayPal cobró un importe distinto al de la solicitud: no se activó."
				: "PayPal cobró, pero el alta no se cerró (empresa, pago o suscripción).",
		detail: `Orden de PayPal ${orderId} · detectado en ${source}`,
	});
}

export type OnboardingWebhookOutcome =
	| { outcome: "applied" }
	| { outcome: "ignored"; reason: CaptureOnboardingFailure }
	| { outcome: "retry"; reason: CaptureOnboardingFailure }
	| { outcome: "failed"; reason: CaptureOnboardingFailure };

/**
 * Webhook de PayPal para órdenes del alta (`CHECKOUT.ORDER.APPROVED` y
 * `PAYMENT.CAPTURE.COMPLETED`): cubre a quien aprueba el pago y cierra la pestaña antes
 * de volver, y al cobro que entró pero no llegó a cerrar el alta. Usa la misma captura
 * que el botón, con sus controles de orden vigente e importe.
 */
export async function applyOnboardingPayPalWebhook(params: {
	supabaseAdmin: SupabaseClient;
	orderId: string;
}): Promise<OnboardingWebhookOutcome> {
	const result = await captureOnboardingPayPalOrder({ supabaseAdmin: params.supabaseAdmin, orderId: params.orderId });
	if (result.ok) return { outcome: "applied" };
	if (isChargedFailure(result.code)) {
		await alertChargedOnboardingFailure(params.orderId, result, "el webhook de PayPal");
		return { outcome: "failed", reason: result.code };
	}
	if (result.code === "paypal_unavailable") return { outcome: "retry", reason: result.code };
	return { outcome: "ignored", reason: result.code };
}
