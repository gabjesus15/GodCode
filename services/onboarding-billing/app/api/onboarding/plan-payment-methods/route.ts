import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

const STRIPE_SECRET = (process.env.STRIPE_SECRET_KEY ?? "").trim();

const COUNTRY_NORMALIZE: Record<string, string> = {
	Chile: "CL",
	Venezuela: "VE",
	CL: "CL",
	VE: "VE",
};

const ALWAYS_AVAILABLE_METHODS = new Set(["stripe", "paypal"]);

function getMethodCountries(method: { countries?: string[] | null }): string[] {
	return Array.isArray(method.countries)
		? method.countries.map((value) => String(value).trim()).filter(Boolean)
		: [];
}

function isAvailableForCountry(method: { slug?: string | null; countries?: string[] | null }, normalizedCountry: string | null, rawCountry: string | null): boolean {
	const slug = String(method.slug ?? "").trim().toLowerCase();
	if (ALWAYS_AVAILABLE_METHODS.has(slug)) return true;
	if (!normalizedCountry && !rawCountry) return true;

	const countries = getMethodCountries(method);
	if (countries.length === 0) return false;
	return countries.includes(normalizedCountry ?? "") || countries.includes(rawCountry ?? "");
}

export async function GET(req: NextRequest) {
	const country = req.nextUrl.searchParams.get("country");
	const normalized = country ? COUNTRY_NORMALIZE[country.trim()] ?? country.trim() : null;

	const { data: methods, error } = await supabaseAdmin
		.from("plan_payment_methods")
		.select("id,slug,name,countries,auto_verify,sort_order")
		.eq("is_active", true)
		.order("sort_order", { ascending: true });

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	let list = methods ?? [];
	if (normalized) {
		list = list.filter((m) => isAvailableForCountry(m, normalized, country?.trim() ?? null));
	} else {
		list = list.filter((m) => isAvailableForCountry(m, null, null));
	}

	if (!STRIPE_SECRET) {
		list = list.filter((m) => String(m.slug ?? "").trim().toLowerCase() !== "stripe");
	}

	const withConfig = await Promise.all(
		list.map(async (m) => {
			const { data: configRows } = await supabaseAdmin
				.from("plan_payment_method_config")
				.select("key,value")
				.eq("method_id", m.id);
			const config: Record<string, string> = {};
			for (const row of configRows ?? []) {
				if (row.key) config[row.key] = row.value ?? "";
			}
			return { ...m, config };
		})
	);

	return NextResponse.json({ data: withConfig });
}
