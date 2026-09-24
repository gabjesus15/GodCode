import { getAppUrl } from "./app-url";

export function resolveTenantPanelLoginUrl(publicSlug: string | null): string {
	if (!publicSlug) return "/login?error=no-access";
	const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim()
		.replace(/^https?:\/\//, "")
		.replace(/\/$/, "");
	if (!baseDomain) return `/${publicSlug}/login`;
	const protocol = process.env.NEXT_PUBLIC_TENANT_PROTOCOL?.trim() || "https";
	return `${protocol}://${publicSlug}.${baseDomain}/login`;
}

/**
 * Panel de ventas (caja) de un negocio, para abrirlo desde el super admin. Es el mismo destino
 * que el botón "Panel" de la página de inicio del negocio: `NEXT_PUBLIC_TENANT_PANEL_URL`; sin esa
 * variable, el login en el subdominio de la tienda.
 */
export function resolveSalesPanelUrl(publicSlug: string | null): string {
	const base = (process.env.NEXT_PUBLIC_TENANT_PANEL_URL ?? "").trim().replace(/\/$/, "");
	if (base) return `${base}/`;
	return publicSlug ? resolveTenantPanelLoginUrl(publicSlug) : "";
}

export function resolveCustomerPortalUrl(path = "/cuenta"): string {
	const base = getAppUrl().replace(/\/$/, "");
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalized}`;
}
