import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { mergeThemeConfig } from "@/lib/store-theme/merge-theme-config";
import {
	isCompanyStorefrontAssetPath,
	STOREFRONT_BRANDING_BUCKET,
} from "@/lib/storage/storefront-branding";
import { getCustomerAccountContext } from "@/lib/tenant/customer-account-context";
import { assertCustomerAccountRateLimit } from "@/lib/tenant/customer-account-rate-limit";
import {
	HOME_PAGE_THEME_KEY,
	normalizeHomePageConfig,
	readHomePageConfig,
} from "@/lib/tenant/home-page/home-page-config";
import { loadHomePageInput } from "@/lib/tenant/home-page/load-home-page";

/** @service-role customer-account
 *
 * Página de inicio del negocio: la config vive en `companies.theme_config.homePage`
 * y se publica al guardar (sin borrador).
 */

async function readCompany(companyId: string) {
	return supabaseAdmin
		.from("companies")
		.select("id,name,public_slug,theme_config")
		.eq("id", companyId)
		.maybeSingle();
}

/** Config guardada + todo lo que el editor necesita para pintar la vista previa real. */
export async function GET() {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "home_page_get", 60, 60_000);
	if (limited) return limited;

	const { data: company, error } = await readCompany(ctx.companyId);
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	const slug = String(company?.public_slug ?? "").trim();
	if (!company || !slug) {
		return NextResponse.json({ error: "El negocio aún no tiene dirección pública." }, { status: 404 });
	}

	const input = await loadHomePageInput(company, slug);
	const { config, ...preview } = input;
	return NextResponse.json({ config, preview });
}

export async function PUT(req: NextRequest) {
	const ctx = await getCustomerAccountContext();
	if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	if (ctx.role !== "ceo") {
		return NextResponse.json({ error: "Solo el dueño puede editar la página de inicio." }, { status: 403 });
	}

	const limited = await assertCustomerAccountRateLimit(ctx.companyId, "home_page_put", 30, 60_000);
	if (limited) return limited;

	const payload = (await req.json().catch(() => null)) as { config?: unknown } | null;
	if (!payload || typeof payload.config !== "object" || payload.config === null) {
		return NextResponse.json({ error: "Falta la configuración de la página." }, { status: 400 });
	}

	const { data: company, error: readError } = await readCompany(ctx.companyId);
	if (readError || !company) {
		return NextResponse.json({ error: readError?.message ?? "Negocio no encontrado" }, { status: 500 });
	}

	const previous = readHomePageConfig(company.theme_config);
	const next = normalizeHomePageConfig(payload.config);
	// La foto de portada tiene que ser una subida de este negocio, nunca una ruta ajena.
	if (next.coverImagePath && !isCompanyStorefrontAssetPath(next.coverImagePath, ctx.companyId)) {
		next.coverImagePath = "";
		if (next.coverMode === "custom-image") next.coverMode = "menu-image";
	}

	const { error: updateError } = await supabaseAdmin
		.from("companies")
		.update({
			theme_config: mergeThemeConfig(company.theme_config, { [HOME_PAGE_THEME_KEY]: next }),
			updated_at: new Date().toISOString(),
		})
		.eq("id", ctx.companyId);

	if (updateError) {
		return NextResponse.json({ error: updateError.message }, { status: 500 });
	}

	// La portada anterior ya no la usa nadie: fuera de Storage. Un fallo aquí no invalida el guardado.
	if (
		previous.coverImagePath &&
		previous.coverImagePath !== next.coverImagePath &&
		isCompanyStorefrontAssetPath(previous.coverImagePath, ctx.companyId)
	) {
		await supabaseAdmin.storage.from(STOREFRONT_BRANDING_BUCKET).remove([previous.coverImagePath]);
	}

	const slug = String(company.public_slug ?? "").trim();
	if (slug) revalidateTag(`company-slug:${slug}`, "max");

	return NextResponse.json({ ok: true, config: next });
}
