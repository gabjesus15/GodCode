import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { companyCanChooseStorefrontEntry } from "@/lib/plans/plan-product-mode";
import { mergeThemeConfig } from "@/lib/store-theme/merge-theme-config";
import {
	STOREFRONT_ENTRIES,
	STOREFRONT_ENTRY_THEME_KEY,
	resolveStorefrontEntry,
	type StorefrontEntry,
} from "@/lib/tenant/home-page/home-page-config";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";

/** @service-role customer-account
 *
 * Entrada de la tienda (portada o carta con panel lateral): la elige el dueño en la
 * pestaña Tienda de /cuenta y se publica al guardar, sin borrador.
 */

async function readCompany(companyId: string) {
	return supabaseAdmin
		.from("companies")
		.select("public_slug,theme_config,plans:plans(is_public)")
		.eq("id", companyId)
		.maybeSingle();
}

export async function GET() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "storefront_entry_get", 60, 60_000);
	if (limited) return limited;

	const { data: company, error } = await readCompany(ctx.companyId);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	if (!company) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

	return NextResponse.json({
		storefrontEntry: resolveStorefrontEntry(company),
		canChooseStorefrontEntry: companyCanChooseStorefrontEntry(company),
	});
}

export async function PUT(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	if (ctx.role !== "ceo") {
		return NextResponse.json({ error: "Solo el dueño puede cambiar la entrada de la tienda." }, { status: 403 });
	}

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "storefront_entry_put", 30, 60_000);
	if (limited) return limited;

	const payload = (await req.json().catch(() => null)) as { storefrontEntry?: string } | null;
	const entry = payload?.storefrontEntry as StorefrontEntry;
	if (!STOREFRONT_ENTRIES.includes(entry)) {
		return NextResponse.json({ error: "Entrada de tienda no válida." }, { status: 400 });
	}

	const { data: company, error: readError } = await readCompany(ctx.companyId);
	if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
	if (!company) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

	// La tarjeta se oculta sin el plan, pero es aquí donde se hace valer.
	if (!companyCanChooseStorefrontEntry(company)) {
		return NextResponse.json({ error: "Tu plan no incluye esta opción." }, { status: 403 });
	}

	const { error: updateError } = await supabaseAdmin
		.from("companies")
		.update({
			theme_config: mergeThemeConfig(company.theme_config, { [STOREFRONT_ENTRY_THEME_KEY]: entry }),
			updated_at: new Date().toISOString(),
		})
		.eq("id", ctx.companyId);

	if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

	const slug = String(company.public_slug ?? "").trim();
	if (slug) revalidateTag(`company-slug:${slug}`, "max");
	revalidateTag(`menu:${ctx.companyId}`, "max");

	return NextResponse.json({ storefrontEntry: entry });
}
