import { companyHasPublicMenu } from "../plans/plan-product-mode";
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
 * Regla compartida por `sitemap.xml` y `/onboarding/negocios`: un negocio se lista en
 * público solo si tiene slug, no es una tienda interna de prueba y su plan incluye menú
 * (con «solo panel CEO» todas sus rutas públicas dan 404; ver `plan-product-mode`).
 */
export function isPubliclyListedCompany(row: PublicTenantListingRow): boolean {
	const slug = typeof row.public_slug === "string" ? row.public_slug.trim() : "";
	if (!slug) return false;
	if (isInternalTestTenantSlug(slug)) return false;
	return companyHasPublicMenu(row);
}
