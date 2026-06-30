/**
 * URL canónica de la aplicación (dominio principal, sin subdominio de tenant).
 * Usada para enlaces en correos (verificación onboarding, etc.) y redirecciones.
 * Debe ser el mismo dominio con el que los usuarios acceden (ej. https://www.godcode.me).
 */

function stripPublicPort(url: URL): URL {
	const isProduction = process.env.NODE_ENV === "production";
	if (!isProduction) return url;
	// En Coolify/Docker la app escucha en :3000; el proxy público usa 443.
	if (url.port === "3000" || url.port === "3001") {
		url.port = "";
	}
	return url;
}

function normalizeAppUrl(raw: string): string {
	try {
		return stripPublicPort(new URL(raw)).toString().replace(/\/$/, "");
	} catch {
		return raw.replace(/\/$/, "");
	}
}

export function getAppUrl(): string {
	const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
	if (explicit) return normalizeAppUrl(explicit);

	const base = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim();
	if (base) {
		const protocol = process.env.NEXT_PUBLIC_TENANT_PROTOCOL?.trim() || "https";
		const host = base.replace(/^https?:\/\//, "").replace(/\/$/, "").split(":")[0];
		return normalizeAppUrl(`${protocol}://${host}`);
	}

	const vercel = process.env.VERCEL_URL?.trim();
	if (vercel && process.env.NODE_ENV !== "production") return `https://${vercel}`;

	return "http://localhost:3000";
}

/** Hostname público (sin puerto) para comparar hosts en proxy. */
export function getAppHostname(): string {
	try {
		return new URL(getAppUrl()).hostname.toLowerCase();
	} catch {
		return "";
	}
}

/** URL absoluta en el dominio principal, sin heredar puerto interno del request. */
export function buildAppUrl(pathname: string, search = ""): string {
	const base = getAppUrl().endsWith("/") ? getAppUrl() : `${getAppUrl()}/`;
	const url = new URL(pathname.startsWith("/") ? pathname : `/${pathname}`, base);
	if (search) {
		url.search = search.startsWith("?") ? search.slice(1) : search;
	}
	return url.toString();
}
