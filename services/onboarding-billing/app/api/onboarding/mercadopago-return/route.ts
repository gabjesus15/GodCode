import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { captureOnboardingMercadoPagoOrder } from "@/lib/onboarding/mercadopago-onboarding";
import { isMercadoPagoOrderId } from "@/lib/payments/mercadopago";
import { getAppUrl } from "@/lib/tenant/app-url";

/** @service-role payment-provider-verified
 *
 * Regreso desde Mercado Pago (`?order_id=…`), pague o no: la orden se consulta a Mercado
 * Pago y se cierra el alta si está cobrada. Si sigue en proceso o falló, vuelve a la página
 * de pago con el aviso. Las redirecciones van siempre a la URL pública de la app.
 */

export async function GET(req: NextRequest) {
	const appUrl = getAppUrl();
	const orderId = (req.nextUrl.searchParams.get("order_id") ?? "").trim();

	if (!isMercadoPagoOrderId(orderId)) {
		return NextResponse.redirect(new URL("/onboarding?error=mercadopago", appUrl));
	}

	try {
		const result = await captureOnboardingMercadoPagoOrder({ supabaseAdmin, orderId });
		if (result.ok) {
			return NextResponse.redirect(new URL(`/checkout/success?ref=${encodeURIComponent(result.ref)}`, appUrl));
		}
		if (!result.verificationToken) {
			return NextResponse.redirect(new URL("/onboarding?error=mercadopago", appUrl));
		}
		// Ya lo cerró otra vía (el webhook llegó antes): la página de pago lo muestra como pagado.
		const notice = result.reason === "failed" || result.reason === "rejected" ? "failure" : "pending";
		const target = `/onboarding/pago?token=${encodeURIComponent(result.verificationToken)}&mp=${notice}`;
		return NextResponse.redirect(new URL(target, appUrl));
	} catch (err) {
		console.error("mercadopago return error:", err);
		return NextResponse.redirect(new URL("/onboarding?error=mercadopago", appUrl));
	}
}
