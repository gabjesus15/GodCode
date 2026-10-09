import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { captureOnboardingMercadoPagoOrder, findOnboardingTokenByPreference } from "@/lib/onboarding/mercadopago-onboarding";
import { getMercadoPagoPaymentOrderId, isMercadoPagoNumericId, isMercadoPagoPreferenceId } from "@/lib/payments/mercadopago";
import { getAppUrl } from "@/lib/tenant/app-url";

/** @service-role payment-provider-verified
 *
 * Regreso desde Mercado Pago (`?merchant_order_id=…&payment_id=…&preference_id=…`), pague o
 * no: la merchant order se consulta a Mercado Pago y se cierra el alta si está cobrada. Si
 * sigue en proceso, falló o no hubo pago, vuelve a la página de pago con el aviso. Las
 * redirecciones van siempre a la URL pública de la app.
 */

export async function GET(req: NextRequest) {
	const appUrl = getAppUrl();
	const params = req.nextUrl.searchParams;
	const failurePage = (token: string, notice: "failure" | "pending") =>
		NextResponse.redirect(new URL(`/onboarding/pago?token=${encodeURIComponent(token)}&mp=${notice}`, appUrl));

	try {
		let merchantOrderId = (params.get("merchant_order_id") ?? "").trim();
		if (!isMercadoPagoNumericId(merchantOrderId)) {
			const paymentId = (params.get("payment_id") ?? params.get("collection_id") ?? "").trim();
			merchantOrderId = isMercadoPagoNumericId(paymentId) ? ((await getMercadoPagoPaymentOrderId(paymentId)) ?? "") : "";
		}

		// Volvió sin pagar (canceló o cerró el checkout): de vuelta al paso de pago.
		if (!isMercadoPagoNumericId(merchantOrderId)) {
			const preferenceId = (params.get("preference_id") ?? "").trim();
			const token = isMercadoPagoPreferenceId(preferenceId) ? await findOnboardingTokenByPreference(supabaseAdmin, preferenceId) : null;
			return token ? failurePage(token, "failure") : NextResponse.redirect(new URL("/onboarding?error=mercadopago", appUrl));
		}

		const result = await captureOnboardingMercadoPagoOrder({ supabaseAdmin, merchantOrderId });
		if (result.ok) {
			return NextResponse.redirect(new URL(`/checkout/success?ref=${encodeURIComponent(result.ref)}`, appUrl));
		}
		if (!result.verificationToken) {
			return NextResponse.redirect(new URL("/onboarding?error=mercadopago", appUrl));
		}
		// Ya lo cerró otra vía (el webhook llegó antes): la página de pago lo muestra como pagado.
		return failurePage(result.verificationToken, result.reason === "failed" || result.reason === "rejected" ? "failure" : "pending");
	} catch (err) {
		console.error("mercadopago return error:", err);
		return NextResponse.redirect(new URL("/onboarding?error=mercadopago", appUrl));
	}
}
