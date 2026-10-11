import type { SupabaseClient } from "@supabase/supabase-js";

import {
	fromMercadoPagoReference,
	getMercadoPagoPayment,
	isMercadoPagoCheckoutReference,
	mercadoPagoPaymentState,
} from "@/lib/payments/mercadopago";
import { parsePayPalCustomId } from "@/lib/payments/paypal";
import { completeOnboardingPayment } from "./complete-onboarding-payment";

export type MercadoPagoOnboardingResult =
	| { ok: true; ref: string }
	| {
			ok: false;
			/**
			 * - `pending`: Mercado Pago aún no confirma el cobro (o no respondió): reintentar después.
			 * - `failed`: el pago no se cobró; hay que volver a pagar.
			 * - `ignored`: el pago no es de un alta (o no existe la solicitud).
			 * - `rejected`: no es el pago vigente o el cobro no cuadra; no se activa nada.
			 */
			reason: "pending" | "failed" | "ignored" | "rejected";
			error: string;
			status: number;
			/** Para volver a la página de pago de la solicitud, si se pudo identificar. */
			verificationToken?: string | null;
	  };

type ApplicationRow = {
	id: string;
	payment_reference: string | null;
	payment_amount: number | null;
	verification_token: string | null;
};

/**
 * Confirma un pago de Mercado Pago del alta y la cierra. La usan el regreso desde Mercado
 * Pago (GET), el webhook y el barrido; todas llegan aquí y `completeOnboardingPayment` es
 * idempotente, así que la que llegue segunda solo confirma.
 *
 * Mismos controles que PayPal: el pago se consulta a Mercado Pago (no se confía en lo que
 * traiga la URL), su `external_reference` debe ser la del checkout vigente de la solicitud
 * (si la persona volvió a pagar o cambió de plan, el viejo ya no vale) y debe estar cobrado
 * por el total.
 */
export async function captureOnboardingMercadoPagoPayment(params: {
	supabaseAdmin: SupabaseClient;
	paymentId: string;
}): Promise<MercadoPagoOnboardingResult> {
	const { supabaseAdmin, paymentId } = params;

	const payment = await getMercadoPagoPayment(paymentId);
	if (payment === undefined) {
		return { ok: false, reason: "pending", error: "No pudimos consultar el pago en Mercado Pago.", status: 502 };
	}
	if (payment === null) {
		return { ok: false, reason: "ignored", error: "El pago no existe en Mercado Pago.", status: 404 };
	}
	const meta = parsePayPalCustomId(fromMercadoPagoReference(payment.externalReference));
	if (meta?.kind !== "onboarding") {
		return { ok: false, reason: "ignored", error: "El pago de Mercado Pago no corresponde a un registro.", status: 400 };
	}

	const { data } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,payment_reference,payment_amount,verification_token")
		.eq("id", meta.applicationId)
		.maybeSingle();
	const app = data as ApplicationRow | null;
	if (!app) return { ok: false, reason: "ignored", error: "Solicitud no encontrada", status: 404 };
	const verificationToken = app.verification_token;

	const reference = String(app.payment_reference ?? "");
	if (!reference || payment.externalReference !== reference) {
		return {
			ok: false,
			reason: "rejected",
			error: "Este pago ya no es el vigente (cambiaste el plan o volviste a pagar). Vuelve a pagar desde el último paso.",
			status: 409,
			verificationToken,
		};
	}

	const state = mercadoPagoPaymentState(payment);
	if (state === "pending") {
		return { ok: false, reason: "pending", error: "Mercado Pago todavía no confirma el pago.", status: 409, verificationToken };
	}
	if (state === "failed") {
		return { ok: false, reason: "failed", error: "El pago en Mercado Pago no se completó.", status: 409, verificationToken };
	}
	if ((payment.currency ?? "").toUpperCase() !== "CLP") {
		return { ok: false, reason: "rejected", error: "La moneda del cobro no coincide. Escríbenos a soporte.", status: 409, verificationToken };
	}
	// El monto lo fija la preferencia que crea el servidor; esto solo descarta un cobro parcial o vacío.
	if (!(payment.amount > 0) || payment.amount < payment.itemsTotal) {
		return { ok: false, reason: "rejected", error: "El monto cobrado no coincide. Escríbenos a soporte.", status: 409, verificationToken };
	}

	// El pago queda a nombre de Mercado Pago aunque en el paso 2 haya elegido otro método.
	await supabaseAdmin
		.from("onboarding_applications")
		.update({ subscription_payment_method: "mercadopago" })
		.eq("id", app.id);

	const result = await completeOnboardingPayment({
		supabaseAdmin,
		applicationId: app.id,
		paymentReference: reference,
		// El historial guarda importes en USD: el que se cobró al tipo de cambio del día.
		amountPaid: Number(app.payment_amount ?? 0),
		methodSlug: "mercadopago",
		methodName: "Mercado Pago",
		chargedMonths: meta.chargedMonths,
		grantedMonths: meta.grantedMonths,
		promoApplied: meta.promoApplied ?? meta.grantedMonths > meta.chargedMonths,
		isManualPayment: false,
	});
	if (!result.ok) {
		return { ok: false, reason: "pending", error: result.error, status: result.status, verificationToken };
	}
	return { ok: true, ref: reference };
}

/**
 * Token de la página de pago de la solicitud cuyo checkout vigente es este. Sirve para
 * devolver a la persona al paso de pago cuando vuelve de Mercado Pago sin haber pagado. Solo
 * con la referencia exacta (lleva un sufijo al azar): un id de solicitud suelto no basta.
 */
export async function findOnboardingTokenByReference(
	supabaseAdmin: SupabaseClient,
	externalReference: string,
): Promise<string | null> {
	if (!isMercadoPagoCheckoutReference(externalReference)) return null;
	const { data } = await supabaseAdmin
		.from("onboarding_applications")
		.select("verification_token")
		.eq("payment_reference", externalReference)
		.maybeSingle();
	return (data as { verification_token: string | null } | null)?.verification_token ?? null;
}
