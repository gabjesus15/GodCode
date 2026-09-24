import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { captureOnboardingPayPalOrder } from "@/lib/onboarding/paypal-onboarding";
import { getAppUrl } from "@/lib/tenant/app-url";

/** @service-role payment-provider-verified
 *
 * Regreso de PayPal por redirección (`?token=<orden>`): misma verificación y captura que
 * el botón. Las redirecciones van siempre a la URL pública de la app, no a la del servicio.
 */

export async function GET(req: NextRequest) {
	const appUrl = getAppUrl();
	const orderId = (req.nextUrl.searchParams.get("token") ?? "").trim();

	if (!orderId || orderId.length > 64 || !/^[A-Za-z0-9-]+$/.test(orderId)) {
		return NextResponse.redirect(new URL("/onboarding?error=paypal", appUrl));
	}

	try {
		const result = await captureOnboardingPayPalOrder({
			supabaseAdmin,
			orderId,
		});
		const target = result.ok
			? `/checkout/success?ref=${encodeURIComponent(result.ref)}`
			: `/checkout/success?ref=${encodeURIComponent(orderId)}&error=${encodeURIComponent(result.error)}`;
		return NextResponse.redirect(new URL(target, appUrl));
	} catch (err) {
		console.error("paypal capture error:", err);
		return NextResponse.redirect(new URL(`/checkout/success?ref=${encodeURIComponent(orderId)}`, appUrl));
	}
}
