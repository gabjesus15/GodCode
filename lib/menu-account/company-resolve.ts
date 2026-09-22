import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCachedCompany } from "@/utils/tenant-cache";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";
import { resolveCheckoutCountryCode } from "@/lib/geo/country-forms";

import { menuAccountErrors } from "./errors";

export type MenuAccountCompany = {
	id: string;
	name: string;
	publicSlug: string;
	countryCode: string;
};

/**
 * Resuelve el negocio a partir del slug del body/query.
 *
 * `proxy.ts` bypasea `/api`, así que las rutas de API son globales y el host no
 * identifica al tenant: el slug tiene que viajar siempre en la petición.
 */
export async function resolveCompanyForMenuAccount(
	slug: string | null | undefined,
): Promise<MenuAccountCompany> {
	const normalizedSlug = String(slug ?? "").trim().toLowerCase();
	if (!normalizedSlug) throw menuAccountErrors.companyNotFound();

	const company = await getCachedCompany(normalizedSlug);
	if (!company || !isTenantSubscriptionAccessible(company)) {
		throw menuAccountErrors.companyNotFound();
	}

	return {
		id: String(company.id),
		name: company.name ?? normalizedSlug,
		publicSlug: company.public_slug ?? normalizedSlug,
		// El país decide la estrategia de documento (RUT / Cédula-RIF / Cédula).
		// Se resuelve en el servidor: nunca se confía en lo que mande el navegador.
		countryCode: resolveCheckoutCountryCode({ businessCountry: company.country }),
	};
}

/**
 * Variante por id, para el carrito: conoce la sucursal (y con ella `company_id`) pero
 * no el slug. Pasa por la resolución por slug para aplicar las mismas reglas de
 * suscripción accesible.
 */
export async function resolveCompanyByIdForMenuAccount(
	companyId: string,
): Promise<MenuAccountCompany> {
	const { data } = await supabaseAdmin
		.from("companies")
		.select("public_slug")
		.eq("id", companyId)
		.maybeSingle();
	if (!data?.public_slug) throw menuAccountErrors.companyNotFound();
	return resolveCompanyForMenuAccount(data.public_slug);
}

/** Valida que la sucursal exista, esté activa y pertenezca a este negocio. */
export async function assertBranchBelongsToCompany(
	branchId: string | null | undefined,
	companyId: string,
): Promise<string | null> {
	if (!branchId) return null;

	const { data } = await supabaseAdmin
		.from("branches")
		.select("id")
		.eq("id", branchId)
		.eq("company_id", companyId)
		.eq("is_active", true)
		.maybeSingle();

	if (!data) throw menuAccountErrors.invalidBranch();
	return String(data.id);
}
