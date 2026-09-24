import "server-only";

const PRIVATE_IP =
	/^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.|::1|fc|fd|fe80)/i;

type GeoIpModule = typeof import("geoip-country").default;
let geoipPromise: Promise<GeoIpModule | null> | null = null;

/** Base de países local (GeoLite2, ~8 MB): se carga una vez, en el primer evento. */
function loadGeoIp(): Promise<GeoIpModule | null> {
	geoipPromise ??= import("geoip-country").then(
		(m) => m.default,
		() => null,
	);
	return geoipPromise;
}

function normalizeCountryCode(raw: string | null | undefined): string | null {
	const code = String(raw ?? "")
		.trim()
		.toUpperCase()
		.replace(/[^A-Z]/g, "")
		.slice(0, 2);
	return code.length === 2 ? code : null;
}

function countryFromHeaders(headers: Headers): string | null {
	return normalizeCountryCode(
		headers.get("x-vercel-ip-country") ||
			headers.get("cf-ipcountry") ||
			headers.get("x-country-code") ||
			headers.get("x-geo-country") ||
			headers.get("cloudfront-viewer-country"),
	);
}

async function lookupCountryByIp(ip: string): Promise<string | null> {
	if (!ip || PRIVATE_IP.test(ip)) return null;
	const geoip = await loadGeoIp();
	try {
		return normalizeCountryCode(geoip?.lookup(ip)?.country);
	} catch {
		return null;
	}
}

/** Resuelve ISO-2 para analytics: headers de CDN primero, luego la base local por IP (el VPS no trae cabecera de país). */
export async function resolveAnalyticsCountryCode(
	headers: Headers,
	ip: string | null,
): Promise<string | null> {
	const fromHeader = countryFromHeaders(headers);
	if (fromHeader) return fromHeader;
	if (!ip) return null;
	return lookupCountryByIp(ip);
}
