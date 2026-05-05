import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const VALID_STATUSES = new Set(["email_verified", "form_completed", "payment_pending", "paid", "approved"]);

type AddonChoice = { addon_id: string; quantity?: number; price_snapshot?: number };

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
	custom_plan_name?: string;
	custom_plan_price?: string;
	custom_domain?: string;
	subscription_payment_method?: string;
	addons?: AddonChoice[];
};

function sanitize(str: string | undefined, maxLen: number): string | null {
	if (str == null) return null;
	const t = String(str).trim();
	return t.length === 0 ? null : t.slice(0, maxLen);
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as CompleteBody;
		const token = sanitize(body.token, 100);
		if (!token) {
			return NextResponse.json({ error: "Token faltante" }, { status: 400 });
		}

		const { data: app, error: fetchError } = await supabaseAdmin
			.from("onboarding_applications")
			.select("id, status, business_name, email, responsible_name")
			.eq("verification_token", token)
			.maybeSingle();

		if (fetchError || !app) {
			return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
		}
		if (!VALID_STATUSES.has(app.status)) {
			return NextResponse.json(
				{ error: "Esta solicitud no está en estado válido para completar" },
				{ status: 400 }
			);
		}

		const logoUrl = sanitize(body.logo_url, 500);

		const updates: Record<string, unknown> = {
			legal_name: sanitize(body.legal_name, 300),
			logo_url: logoUrl,
			fiscal_address: sanitize(body.fiscal_address, 500),
			billing_address: sanitize(body.billing_address, 500),
			billing_rut: sanitize(body.billing_rut, 100),
			social_instagram: sanitize(body.social_instagram, 200),
			social_facebook: sanitize(body.social_facebook, 200),
			social_twitter: sanitize(body.social_twitter, 200),
			description: sanitize(body.description, 2000),
			plan_id: body.plan_id && String(body.plan_id).trim() ? body.plan_id : null,
			country: sanitize(body.country, 100),
			payment_methods: Array.isArray(body.payment_methods) ? body.payment_methods : [],
			currency: sanitize(body.currency, 10),
			custom_plan_name: sanitize(body.custom_plan_name, 100),
			custom_plan_price: sanitize(body.custom_plan_price, 20),
			custom_domain: sanitize(body.custom_domain, 100),
			subscription_payment_method: sanitize(body.subscription_payment_method, 50),
			status: "form_completed",
			updated_at: new Date().toISOString(),
		};

		const { error: updateError } = await supabaseAdmin
			.from("onboarding_applications")
			.update(updates)
			.eq("id", app.id);

		if (updateError) {
			return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
		}

		const addons = Array.isArray(body.addons) ? body.addons : [];
		await supabaseAdmin.from("onboarding_application_addons").delete().eq("application_id", app.id);
		if (addons.length > 0) {
			const rows = addons
				.filter((a) => a?.addon_id && String(a.addon_id).trim())
				.map((a) => ({
					application_id: app.id,
					addon_id: String(a.addon_id).trim(),
					quantity: Math.max(1, Math.min(99, Number(a.quantity) || 1)),
					price_snapshot: a.price_snapshot != null ? Number(a.price_snapshot) : null,
				}));
			if (rows.length > 0) {
				await supabaseAdmin.from("onboarding_application_addons").insert(rows);
			}
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
