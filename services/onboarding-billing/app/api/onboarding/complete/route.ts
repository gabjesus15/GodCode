import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { priceApplicationAddons } from "@/lib/onboarding/checkout-service";

/** @service-role capability-token */

type AddonChoice = { addon_id: string; quantity?: number };

type CompleteBody = {
	token: string;
	legal_name?: string;
	logo_url?: string;
	fiscal_address?: string;
	billing_address?: string;
	billing_rut?: string;
	social_instagram?: string;
	social_facebook?: string;
	social_twitter?: string;
	description?: string;
	plan_id?: string;
	country?: string;
	payment_methods?: string[];
	currency?: string;
	subscription_payment_method?: string;
	addons?: AddonChoice[];
};

function sanitize(str: string | undefined, maxLen: number): string | null {
	if (str == null) return null;
	const t = String(str).trim();
	return t.length === 0 ? null : t.slice(0, maxLen);
}

/**
 * ¿Se pueden cambiar plan, extras o método? Sí mientras no haya un pago cobrado ni un
 * comprobante subido. Si ya había un pago iniciado (orden de PayPal o datos de
 * transferencia), se descarta: la orden vieja deja de valer y hay que volver a pagar.
 */
function canEditApplication(app: { status: string; payment_status: string | null; payment_reference_url: string | null }): boolean {
	if (app.status === "email_verified" || app.status === "form_completed") return true;
	if (app.status !== "payment_pending") return false;
	if (app.payment_status === "paid") return false;
	if (app.payment_status === "pending_validation" && app.payment_reference_url) return false;
	return true;
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as CompleteBody;
		const token = sanitize(body.token, 100);
		if (!token) {
			return NextResponse.json({ error: "Falta el enlace de tu solicitud. Vuelve a abrirlo desde el correo." }, { status: 400 });
		}

		const { data: app, error: fetchError } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id,status,payment_status,payment_reference_url")
			.eq("verification_token", token)
			.maybeSingle();

		if (fetchError || !app) {
			return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
		}
		if (!canEditApplication(app)) {
			return NextResponse.json(
				{
					error:
						app.payment_status === "paid"
							? "Tu pago ya está registrado; el plan no se puede cambiar desde aquí."
							: "Ya subiste un comprobante. Si necesitas cambiar algo, escríbenos a soporte.",
				},
				{ status: 409 },
			);
		}

		const planId = sanitize(body.plan_id, 64);
		if (!planId) {
			return NextResponse.json({ error: "Elige un plan" }, { status: 400 });
		}
		const { data: plan } = await supabaseAdmin
			.from("plans")
			.select("id,name,features,max_branches,max_users,is_active,is_public")
			.eq("id", planId)
			.maybeSingle();
		if (!plan || plan.is_active === false || plan.is_public !== true) {
			return NextResponse.json({ error: "Ese plan no está disponible. Elige otro." }, { status: 400 });
		}

		const updates: Record<string, unknown> = {
			legal_name: sanitize(body.legal_name, 300),
			logo_url: sanitize(body.logo_url, 500),
			fiscal_address: sanitize(body.fiscal_address, 500),
			billing_address: sanitize(body.billing_address, 500),
			billing_rut: sanitize(body.billing_rut, 100),
			social_instagram: sanitize(body.social_instagram, 200),
			social_facebook: sanitize(body.social_facebook, 200),
			social_twitter: sanitize(body.social_twitter, 200),
			description: sanitize(body.description, 2000),
			plan_id: plan.id,
			country: sanitize(body.country, 100),
			payment_methods: Array.isArray(body.payment_methods) ? body.payment_methods.slice(0, 20) : [],
			currency: sanitize(body.currency, 10),
			// El dominio propio es un extra de pago y los planes a medida los crea el equipo:
			// no se aceptan desde el formulario público.
			custom_domain: null,
			custom_plan_name: null,
			custom_plan_price: null,
			subscription_payment_method: sanitize(body.subscription_payment_method, 50),
			status: "form_completed",
			// Cualquier pago iniciado antes deja de valer (otro plan u otro método).
			payment_reference: null,
			payment_status: null,
			payment_reference_url: null,
			payment_months: null,
			payment_amount: null,
			updated_at: new Date().toISOString(),
		};

		const { error: updateError } = await supabaseAdmin
			.from("onboarding_applications")
			.update(updates)
			.eq("id", app.id);

		if (updateError) {
			return NextResponse.json({ error: "No pudimos guardar tus datos. Intenta de nuevo." }, { status: 500 });
		}

		const choices = Array.isArray(body.addons) ? body.addons.slice(0, 20) : [];
		const priced = await priceApplicationAddons(supabaseAdmin, choices, plan);
		await supabaseAdmin.from("onboarding_application_addons").delete().eq("application_id", app.id);
		if (priced.length > 0) {
			await supabaseAdmin.from("onboarding_application_addons").insert(
				priced.map((addon) => ({
					application_id: app.id,
					addon_id: addon.addon_id,
					quantity: addon.quantity,
					// Solo informativo (lo que valía al elegirlo): el cobro se recalcula en el checkout.
					price_snapshot: addon.unit_price,
				})),
			);
		}

		return NextResponse.json({
			ok: true,
			token,
			message: "Datos guardados. Puedes continuar al pago.",
		});
	} catch (err) {
		console.error("onboarding complete error:", err);
		return NextResponse.json({ error: "Error interno. Intenta más tarde." }, { status: 500 });
	}
}
