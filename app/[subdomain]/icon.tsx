import { getCachedCompany } from "../../utils/tenant-cache";
import { createStorefrontAssetSignedUrl } from "@/lib/storage/storefront-branding";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";
import { sanitizeHexColor } from "@/lib/store-theme/apply-theme-css-vars";
import { readThemeConfigObject } from "@/lib/store-theme/merge-theme-config";
import { escapeXml, fetchTenantLogo, iconInitials, TENANT_ICON_SECURITY_HEADERS } from "@/lib/tenant/favicon-icon";
import { resolveTenantDisplayName } from "@/lib/tenant/seo-metadata";
import { parseThemeLogoUrl } from "@/lib/tenant/tenant-favicon-utils";

/** Color del tema validado: sin esto un `primaryColor` con `"/>` escapaba del SVG. */
function themeColor(value: unknown, fallback: string) {
	return sanitizeHexColor(typeof value === "string" ? value.trim() : "", fallback);
}

export default async function Icon(props: { params: Promise<{ subdomain: string }> }) {
	// Validación segura para evitar el error de "reading params of undefined" durante el build
	const resolvedParams = props?.params ? await props.params : null;
	const subdomain = resolvedParams?.subdomain;

	if (!subdomain) {
		return new Response(null, { status: 404 });
	}

	const company = await getCachedCompany(subdomain);

	const theme = readThemeConfigObject(company?.theme_config);
	const isUnavailable = !isTenantSubscriptionAccessible(company);

	// Logo del tema: solo imágenes de mapa de bits desde https público o nuestro Storage.
	const storedLogoUrl = parseThemeLogoUrl(company?.theme_config);
	const logoUrl = company?.id ? await createStorefrontAssetSignedUrl(storedLogoUrl, String(company.id)) : "";

	if (logoUrl && !isUnavailable) {
		const logo = await fetchTenantLogo(logoUrl);
		if (logo) {
			return new Response(new Uint8Array(logo.buf), {
				headers: {
					...TENANT_ICON_SECURITY_HEADERS,
					"Content-Type": logo.contentType,
					"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
				},
			});
		}
	}

	const displayName = isUnavailable ? "Gcode" : resolveTenantDisplayName(company, { slug: subdomain });
	const primaryColor = themeColor(theme.primaryColor, "#111827");
	const secondaryColor = themeColor(theme.secondaryColor, primaryColor);
	const initials = escapeXml(iconInitials(displayName));

	const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
		`<defs><linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%"><stop offset="0%" stop-color="${primaryColor}"/><stop offset="100%" stop-color="${secondaryColor}"/></linearGradient></defs>` +
		`<rect width="64" height="64" rx="12" fill="url(#g)"/>` +
		`<text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="Arial, sans-serif" font-size="28" font-weight="700">${initials}</text>` +
		`</svg>`;

	return new Response(svg, {
		headers: {
			...TENANT_ICON_SECURITY_HEADERS,
			"Content-Type": "image/svg+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
		},
	});
}
