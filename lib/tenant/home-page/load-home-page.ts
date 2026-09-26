import "server-only";

import { getCachedMenuStaticData } from "@/lib/tenant/cached-menu";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { resolveTenantDisplayName } from "@/lib/tenant/seo-metadata";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";

import { readHomePageConfig } from "./home-page-config";
import type { ResolveHomePageInput } from "./resolve-home-page";

type HomePageCompany = {
	id: string | number;
	name?: string | null;
	theme_config?: unknown;
};

/**
 * Lo mínimo para dibujar la marca del local (tarjeta de vista previa al
 * compartir): tema, config de portada y URLs firmadas del logo y la portada.
 * Sin sucursales ni cajas: la tarjeta queda en caché y no muestra estado. El
 * horario solo se lee para la frase por defecto, igual que en la home.
 */
export async function loadHomeBrandInput(company: HomePageCompany, publicSlug: string): Promise<ResolveHomePageInput> {
	const companyId = String(company.id);
	const theme = normalizeStoreThemeConfig(company.theme_config, company.name ?? "");
	const staticData = await getCachedMenuStaticData(companyId, publicSlug);
	const config = readHomePageConfig(company.theme_config, { schedule: staticData.businessInfo?.schedule ?? null });
	const [logoUrl, menuImageUrl, customCoverUrl] = await Promise.all([
		createStorefrontAssetSignedUrl(theme.logoUrl, companyId),
		createStorefrontAssetSignedUrl(theme.backgroundImageUrl, companyId),
		config.coverMode === "custom-image" ? createStorefrontAssetSignedUrl(config.coverImagePath, companyId) : Promise.resolve(""),
	]);
	return {
		config,
		theme,
		name: resolveTenantDisplayName(company, { slug: publicSlug }),
		logoUrl: logoUrl || null,
		menuImageUrl: menuImageUrl || null,
		customCoverUrl: customCoverUrl || null,
		branches: [],
		openBranchIds: null,
		schedule: null,
	};
}

/**
 * Todo lo que necesita `resolveHomePage` a partir de la fila de la empresa:
 * config de la portada, tema publicado, imágenes firmadas, sucursales activas,
 * cajas abiertas y horario.
 */
export async function loadHomePageInput(company: HomePageCompany, publicSlug: string): Promise<ResolveHomePageInput> {
	const companyId = String(company.id);
	const theme = normalizeStoreThemeConfig(company.theme_config, company.name ?? "");
	const supabase = createSupabasePublicServerClient();

	const [staticData, { data: openShifts }] = await Promise.all([
		getCachedMenuStaticData(companyId, publicSlug),
		supabase.from("cash_shifts").select("branch_id").eq("company_id", companyId).eq("status", "open"),
	]);

	const schedule = staticData.businessInfo?.schedule ?? null;
	const config = readHomePageConfig(company.theme_config, { schedule });

	const [logoUrl, menuImageUrl, customCoverUrl] = await Promise.all([
		createStorefrontAssetSignedUrl(theme.logoUrl, companyId),
		createStorefrontAssetSignedUrl(theme.backgroundImageUrl, companyId),
		config.coverMode === "custom-image" ? createStorefrontAssetSignedUrl(config.coverImagePath, companyId) : Promise.resolve(""),
	]);

	return {
		config,
		theme,
		name: resolveTenantDisplayName(company, { slug: publicSlug }),
		logoUrl: logoUrl || null,
		menuImageUrl: menuImageUrl || null,
		customCoverUrl: customCoverUrl || null,
		branches: staticData.branches.map((branch) => ({
			id: String(branch.id),
			name: branch.name,
			whatsapp_url: branch.whatsapp_url,
			instagram_url: branch.instagram_url,
			map_url: branch.map_url,
			phone: branch.phone,
		})),
		// Una caja abierta sin sucursal (dato heredado) no cuenta como local abierto.
		openBranchIds: (openShifts ?? [])
			.map((shift) => (shift.branch_id == null ? "" : String(shift.branch_id)))
			.filter(Boolean),
		schedule,
	};
}
