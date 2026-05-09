import { getCachedCompany } from "../../utils/tenant-cache";
import { getCloudinaryOptimizedUrl } from "../../components/tenant/utils/cloudinary";

function getInitials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
	return (initials.join("") || "GC").slice(0, 2);
}

function normalizeColor(value: unknown, fallback: string) {
	if (!value || typeof value !== "string") return fallback;
	const t = value.trim();
	return t.length > 0 ? t : fallback;
}

interface IconThemeConfig {
	logoUrl?: string;
	imageUrl?: string;
	displayName?: string;
	primaryColor?: string;
	secondaryColor?: string;
}

export default async function Icon(props: { params: Promise<{ subdomain: string }> }) {
	// Validación segura para evitar el error de "reading params of undefined" durante el build
	const resolvedParams = props?.params ? await props.params : null;
	const subdomain = resolvedParams?.subdomain;

	if (!subdomain) {
		return new Response(null, { status: 404 });
	}

	const company = await getCachedCompany(subdomain);

	const theme_config: IconThemeConfig = (company?.theme_config as unknown as IconThemeConfig) || {};
	const status = String(company?.subscription_status ?? "").toLowerCase();
	const isUnavailable = status === "suspended" || status === "cancelled";

	// Búsqueda del logo en la configuración del tema
	const logoUrl = (theme_config?.logoUrl || theme_config?.imageUrl) as string | undefined;

	if (logoUrl && typeof logoUrl === "string" && logoUrl.trim() && !isUnavailable) {
		const optimizedLogo = getCloudinaryOptimizedUrl(logoUrl.trim(), {
			width: 64,
			height: 64,
			crop: "fill",
			gravity: "auto",
		});

		// Verificamos que optimizedLogo sea un string antes de operar con él
		if (typeof optimizedLogo === "string") {
			// fetch en el servidor requiere una URL con protocolo (https:).
			const finalLogoUrl = optimizedLogo.startsWith("//") ? `https:${optimizedLogo}` : optimizedLogo;

			try {
				const res = await fetch(finalLogoUrl);
				if (res.ok) {
					const contentType = res.headers.get("content-type") || "image/png";
					const buffer = await res.arrayBuffer();
					return new Response(new Uint8Array(buffer), {
						headers: {
							"Content-Type": contentType,
							"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
						},
					});
				}
			} catch (error) {
				console.error("[Icon] Error fetching logo:", error);
			}
		}
	}

	const displayName = isUnavailable
		? "GodCode"
		: typeof theme_config.displayName === "string" && theme_config.displayName.trim()
		? theme_config.displayName.trim()
		: company?.name ?? "GodCode";

	const primaryColor = normalizeColor(theme_config.primaryColor, "#111827");
	const secondaryColor = normalizeColor(theme_config.secondaryColor, primaryColor);
	const initials = getInitials(displayName);

	const svg = `<?xml version="1.0" encoding="UTF-8"?>\n` +
		`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
		`<defs><linearGradient id="g" x1="0%" x2="100%" y1="0%" y2="100%"><stop offset="0%" stop-color="${primaryColor}"/><stop offset="100%" stop-color="${secondaryColor}"/></linearGradient></defs>` +
		`<rect width="64" height="64" rx="12" fill="url(#g)"/>` +
		`<text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-family="Arial, sans-serif" font-size="28" font-weight="700">${initials}</text>` +
		`</svg>`;

	return new Response(svg, {
		headers: {
			"Content-Type": "image/svg+xml; charset=utf-8",
			"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
		},
	});
}