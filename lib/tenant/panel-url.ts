export function resolveTenantPanelLoginUrl(publicSlug: string | null): string {
	if (!publicSlug) return "/login?error=no-access";
	const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim()
		.replace(/^https?:\/\//, "")
		.replace(/\/$/, "");
	if (!baseDomain) return `/${publicSlug}/login`;
	const protocol = process.env.NEXT_PUBLIC_TENANT_PROTOCOL?.trim() || "https";
	return `${protocol}://${publicSlug}.${baseDomain}/login`;
}

/** Secciones del panel CEO a las que se puede llegar directo. */
export type SalesPanelTab = "products";

/**
 * Panel CEO de un negocio (donde carga productos y ve pedidos; la caja está dentro). Es el
 * mismo destino que el botón "Panel" de la página de inicio del negocio:
 * `NEXT_PUBLIC_TENANT_PANEL_URL`; sin esa variable, el login en el subdominio de la tienda.
 * Con `tab` abre directo esa sección (solo con la variable: el login no la conserva).
 * Sin variable ni slug devuelve "": no hay a dónde mandar.
 */
export function resolveSalesPanelUrl(publicSlug: string | null, options: { tab?: SalesPanelTab } = {}): string {
	const base = (process.env.NEXT_PUBLIC_TENANT_PANEL_URL ?? "").trim().replace(/\/$/, "");
	if (base) return options.tab ? `${base}/admin?tab=${options.tab}` : `${base}/`;
	return publicSlug ? resolveTenantPanelLoginUrl(publicSlug) : "";
}
