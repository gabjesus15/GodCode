import { isInternalTestTenantSlug } from "./internal-test-tenant";

/**
 * Negocio tal como lo devuelve `companies` con el join `plans:plans(features)`.
 * El join llega como objeto o como arreglo según el cliente de Supabase.
 */
export type PublicTenantListingRow = {
	public_slug?: string | null;
	plans?: unknown;
};

/**
 * `plans.features.product_mode` del PR #13: con «solo panel CEO» (`panel_only`) el negocio
 * no tiene menú ni página pública (todas sus rutas dan 404), así que no debe salir en el
 * sitemap ni en el directorio. Cualquier otro valor, o la clave ausente, es un plan con menú.
 *
 * Cuando #13 esté en main, esto puede delegar en `companyHasPublicMenu` de
 * `lib/plans/plan-product-mode.ts`; mientras tanto se lee la misma clave aquí para que el
 * sitemap no dependa de ese PR.
 */
export function companyPlanHasPublicMenu(plans: unknown): boolean {
	const row = Array.isArray(plans) ? plans[0] : plans;
	if (!row || typeof row !== "object") return true;
	const features = (row as { features?: unknown }).features;
	if (!features || typeof features !== "object" || Array.isArray(features)) return true;
	return (features as { product_mode?: unknown }).product_mode !== "panel_only";
}

/**
 * Regla compartida por `sitemap.xml` y `/onboarding/negocios`: un negocio se lista en
 * público solo si tiene slug, no es una tienda interna de prueba y su plan incluye menú.
 */
export function isPubliclyListedCompany(row: PublicTenantListingRow): boolean {
	const slug = typeof row.public_slug === "string" ? row.public_slug.trim() : "";
	if (!slug) return false;
	if (isInternalTestTenantSlug(slug)) return false;
	return companyPlanHasPublicMenu(row.plans);
}
