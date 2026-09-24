import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import {
	priceApplicationAddons,
	resolveCheckoutPlan,
	resolveCheckoutPlanPrice,
	type OnboardingApplication,
} from "@/lib/onboarding/checkout-service";
import { isFirstPaymentPromoEligible } from "@/lib/onboarding/first-payment-promo-service";

/** @service-role capability-token
 *
 * Estado de la solicitud para la página de pago. Solo devuelve lo que esa página usa:
 * el token viaja en la URL, así que antes exponía RUT, direcciones y redes a quien lo tuviera.
 * Incluye el presupuesto (plan, extras y método) calculado con las mismas funciones que
 * el cobro, para mostrar el total antes de pagar; el monto final lo vuelve a calcular el checkout.
 */

type QuoteAddon = { name: string; unit: number; quantity: number; monthly: boolean };
type Quote = {
	plan: { name: string; monthly: number };
	addons: QuoteAddon[];
	method: { slug: string; name: string } | null;
};

async function buildQuote(app: {
	id: string;
	plan_id: string | null;
	country: string | null;
	subscription_payment_method: string | null;
}): Promise<Quote | null> {
	const planResult = await resolveCheckoutPlan(supabaseAdmin, app as unknown as OnboardingApplication);
	if (!planResult.plan) return null;
	const plan = planResult.plan;
	const pricing = resolveCheckoutPlanPrice(plan, app.country);

	const { data: choices } = await supabaseAdmin
		.from("onboarding_application_addons")
		.select("addon_id,quantity")
		.eq("application_id", app.id);
	const priced = await priceApplicationAddons(supabaseAdmin, (choices ?? []) as Array<{ addon_id: string; quantity?: number | null }>, plan);
	const ids = priced.map((row) => row.addon_id);
	const slug = String(app.subscription_payment_method ?? "").trim().toLowerCase();
	const [{ data: addonRows }, { data: method }] = await Promise.all([
		ids.length ? supabaseAdmin.from("addons").select("id,name").in("id", ids) : Promise.resolve({ data: [] }),
		slug ? supabaseAdmin.from("plan_payment_methods").select("slug,name").eq("slug", slug).maybeSingle() : Promise.resolve({ data: null }),
	]);
	const names = new Map(((addonRows ?? []) as Array<{ id: string; name: string | null }>).map((row) => [row.id, row.name ?? ""]));

	return {
		plan: { name: String(plan.name ?? "Plan"), monthly: Number(pricing.price ?? 0) || 0 },
		addons: priced.map((row) => ({ name: names.get(row.addon_id) || "Extra", unit: row.unit_price, quantity: row.quantity, monthly: row.is_monthly })),
		method: method ? { slug: String((method as { slug: string }).slug), name: String((method as { name: string | null }).name ?? slug) } : null,
	};
}

export async function GET(req: NextRequest) {
	const token = req.nextUrl.searchParams.get("token")?.trim();
	if (!token || token.length > 100) {
		return NextResponse.json({ error: "Falta el enlace de tu solicitud." }, { status: 400 });
	}

	const { data, error } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,status,company_id,plan_id,business_name,subscription_payment_method,payment_status,payment_reference_url,country")
		.eq("verification_token", token)
		.maybeSingle();

	if (error) {
		return NextResponse.json({ error: "No pudimos cargar tu solicitud." }, { status: 500 });
	}
	if (!data) {
		return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
	}

	const [promoAvailable, quote] = await Promise.all([
		isFirstPaymentPromoEligible(supabaseAdmin, {
			email: data.email,
			excludeCompanyId: data.company_id,
		}),
		buildQuote(data).catch(() => null),
	]);

	return NextResponse.json({
		status: data.status,
		business_name: data.business_name,
		subscription_payment_method: data.subscription_payment_method,
		payment_status: data.payment_status,
		receipt_uploaded: Boolean(data.payment_reference_url),
		country: data.country,
		promo_available: promoAvailable,
		quote,
	});
}
