/** Resolución de logo y versión de caché compartida entre layout, manifest y la ruta tenant-favicon. */

export function parseThemeLogoUrl(themeConfig: unknown): string {
	if (themeConfig == null) return "";
	if (typeof themeConfig === "string") {
		const s = themeConfig.trim();
		if (!s.startsWith("{") && !s.startsWith("[")) return "";
		try {
			return parseThemeLogoUrl(JSON.parse(s) as unknown);
		} catch {
			return "";
		}
	}
	if (typeof themeConfig !== "object") return "";
	const tc = themeConfig as Record<string, unknown>;
	const raw = tc.logoUrl ?? tc.logo_url ?? tc.imageUrl ?? tc.image_url;
	if (typeof raw !== "string") return "";
	const t = raw.trim();
	return t.length > 0 ? t : "";
}

/**
 * Incluye huella de la URL del logo para que al cambiar solo el logo se invalide favicon / PWA
 * aunque `updated_at` no se haya refrescado igual de rápido.
 */
export function tenantBrandingIconVersionSeed(company: {
	id?: string;
	updated_at?: string | null;
	theme_config?: unknown;
}): string {
	const logo = parseThemeLogoUrl(company.theme_config);
	const base = String(company.updated_at ?? company.id ?? "");
	if (!logo) return base;
	let h = 0;
	for (let i = 0; i < logo.length; i++) {
		h = (Math.imul(31, h) + logo.charCodeAt(i)) | 0;
	}
	return `${base}-${Math.abs(h).toString(36)}`;
}
