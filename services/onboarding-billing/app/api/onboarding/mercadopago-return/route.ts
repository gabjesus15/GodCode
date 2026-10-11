import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { captureOnboardingMercadoPagoPayment, findOnboardingTokenByReference } from "@/lib/onboarding/mercadopago-onboarding";
import { isMercadoPagoNumericId } from "@/lib/payments/mercadopago";
import { getAppUrl } from "@/lib/tenant/app-url";

/** @service-role payment-provider-verified
 *
 * Regreso desde Mercado Pago (`?payment_id=…&external_reference=…&status=…`), pague o no: el
 * pago se consulta a Mercado Pago y se cierra el alta si está cobrado. Si sigue en proceso,
 * falló o no hubo pago, vuelve a la página de pago con el aviso. Las redirecciones van
 * siempre a la URL pública de la app.
 */

export async function GET(req: NextRequest) {
	const appUrl = getAppUrl();
	const params = req.nextUrl.searchParams;
	const failurePage = (token: string, notice: "failure" | "pending") =>
		NextResponse.redirect(new URL(`/onboarding/pago?token=${encodeURIComponent(token)}&mp=${notice}`, appUrl));

	try {
		// Si canceló, Mercado Pago manda `payment_id=null`.
		const paymentId = (params.get("payment_id") ?? params.get("collection_id") ?? "").trim();

		// Volvió sin pagar (canceló o cerró el checkout): de vuelta al paso de pago.
		if (!isMercadoPagoNumericId(paymentId)) {
			const reference = (params.get("external_reference") ?? "").trim();
			const token = await findOnboardingTokenByReference(supabaseAdmin, reference);
			return token ? failurePage(token, "failure") : NextResponse.redirect(new URL("/onboarding?error=mercadopago", appUrl));
		}

		const result = await captureOnboardingMercadoPagoPayment({ supabaseAdmin, paymentId });
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
