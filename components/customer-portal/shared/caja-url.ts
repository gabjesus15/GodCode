import type { CompanySnapshot } from "./customer-account-types";

/**
 * Caja (panel de ventas) del negocio: `NEXT_PUBLIC_TENANT_PANEL_URL` o, sin esa variable,
 * el login en el subdominio de la tienda. Con `tab` abre directo esa sección de la Caja.
 */
export function resolveCajaUrl(company: Pick<CompanySnapshot, "tenantAdminUrl">, tab?: "products"): string | null {
	const base = (process.env.NEXT_PUBLIC_TENANT_PANEL_URL ?? "").trim().replace(/\/$/, "");
	if (base) return tab ? `${base}/admin?tab=${tab}` : base;
	return company.tenantAdminUrl || null;
}
