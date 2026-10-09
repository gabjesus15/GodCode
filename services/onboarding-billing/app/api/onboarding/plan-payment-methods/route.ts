import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isManualMethod, isOnlineMethod, MERCADOPAGO_RATE_KEY } from "@/lib/onboarding/checkout-service";
import { isPaymentMethodAvailableForCountry } from "@/lib/payments/payment-method-countries";
import { isMercadoPagoConfigured, parseUsdClpRate } from "@/lib/payments/mercadopago";

/** @service-role public-read
 *
 * Métodos de pago activos por país para el formulario de alta. Misma regla de países que
 * el checkout y /cuenta (`isPaymentMethodAvailableForCountry`), así que no se ofrece nada
 * que luego se rechace al pagar.
 */

type MethodRow = {
	id: string;
	slug: string;
	name: string;
	countries: string[] | null;
	auto_verify: boolean | null;
	sort_order: number | null;
};

export async function GET(req: NextRequest) {
	const country = req.nextUrl.searchParams.get("country")?.trim() || null;

	const { data: methods, error } = await supabaseAdmin
		.from("plan_payment_methods")
		.select("id,slug,name,countries,auto_verify,sort_order")
		.eq("is_active", true)
		.order("sort_order", { ascending: true });

	if (error) {
		console.error("onboarding plan-payment-methods:", error.message);
		return NextResponse.json({ error: "No pudimos cargar los métodos de pago." }, { status: 500 });
	}

	const list = ((methods ?? []) as MethodRow[]).filter((method) => {
		const slug = String(method.slug ?? "").trim().toLowerCase();
		// Solo lo que el checkout sabe cobrar: PayPal y Mercado Pago en línea, y los métodos manuales.
		if (!isOnlineMethod(slug) && !isManualMethod(slug)) return false;
		// Sin credenciales en el servidor, Mercado Pago no se puede cobrar.
		if (slug === "mercadopago" && !isMercadoPagoConfigured()) return false;
		return isPaymentMethodAvailableForCountry(method.countries, country);
	});

	const { data: configRows } = list.length
		? await supabaseAdmin
				.from("plan_payment_method_config")
				.select("method_id,key,value")
				.in(
					"method_id",
					list.map((method) => method.id),
				)
		: { data: [] };

	const configByMethod = new Map<string, Record<string, string>>();
	for (const row of (configRows ?? []) as Array<{ method_id: string; key: string | null; value: string | null }>) {
		if (!row.key) continue;
		const config = configByMethod.get(row.method_id) ?? {};
		config[row.key] = row.value ?? "";
		configByMethod.set(row.method_id, config);
	}

	// Mercado Pago cobra en CLP: sin tasa USD→CLP válida no se ofrece.
	const payable = list.filter(
		(method) => method.slug.trim().toLowerCase() !== "mercadopago" || parseUsdClpRate(configByMethod.get(method.id)?.[MERCADOPAGO_RATE_KEY]) !== null,
	);

	return NextResponse.json({
		data: payable.map((method) => ({ ...method, config: configByMethod.get(method.id) ?? {} })),
	});
}
