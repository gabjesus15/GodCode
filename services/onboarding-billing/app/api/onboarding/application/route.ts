import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isFirstPaymentPromoEligible } from "@/lib/onboarding/first-payment-promo-service";

export async function GET(req: NextRequest) {
	const token = req.nextUrl.searchParams.get("token");
	if (!token) {
		return NextResponse.json({ error: "Token faltante" }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("onboarding_applications")
		.select(
			"id,business_name,responsible_name,email,status,legal_name,logo_url,fiscal_address,billing_address,billing_rut,social_instagram,social_facebook,social_twitter,description,plan_id,country,currency,custom_plan_name,custom_plan_price,custom_domain,subscription_payment_method"
		)
		.eq("verification_token", token)
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: "Error al cargar" }, { status: 500 });
	}
	if (!data) {
		return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
	}

	const promoAvailable = await isFirstPaymentPromoEligible(supabaseAdmin, {
		email: data.email,
		excludeCompanyId: data.company_id,
	});

	return NextResponse.json({ ...data, promo_available: promoAvailable });
}
