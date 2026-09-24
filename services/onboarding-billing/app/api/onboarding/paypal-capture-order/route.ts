import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { captureOnboardingPayPalOrder } from "@/lib/onboarding/paypal-onboarding";

/** @service-role payment-provider-verified
 *
 * La orden se verifica contra PayPal (solicitud vigente e importe) antes de capturarla.
 */

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { orderId?: string; token?: string };
		const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
		const token = typeof body.token === "string" ? body.token.trim() : "";

		if (!orderId || orderId.length > 64 || !/^[A-Za-z0-9-]+$/.test(orderId)) {
			return NextResponse.json({ error: "Orden de PayPal inválida" }, { status: 400 });
		}

		const result = await captureOnboardingPayPalOrder({
			supabaseAdmin,
			orderId,
			verificationToken: token || null,
		});

		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: result.status });
		}
		return NextResponse.json({ ok: true, ref: result.ref });
	} catch (err) {
		console.error("paypal capture order error:", err);
		return NextResponse.json({ error: "Error interno" }, { status: 500 });
	}
}
