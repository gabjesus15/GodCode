import "server-only";

const PRIVATE_IP =
	/^(?:127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[0-1])\.|::1|fc|fd|fe80)/i;

const countryCache = new Map<string, { code: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

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

	const cached = countryCache.get(ip);
	if (cached && cached.expiresAt > Date.now()) return cached.code;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 800);
	try {
		const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
			signal: controller.signal,
			headers: { Accept: "text/plain" },
			cache: "no-store",
		});
		if (!res.ok) {
			countryCache.set(ip, { code: null, expiresAt: Date.now() + 60_000 });
			return null;
		}
		const text = (await res.text()).trim();
		const code = normalizeCountryCode(text === "Undefined" ? null : text);
		countryCache.set(ip, { code, expiresAt: Date.now() + CACHE_TTL_MS });
		return code;
	} catch {
		countryCache.set(ip, { code: null, expiresAt: Date.now() + 60_000 });
		return null;
	} finally {
		clearTimeout(timer);
	}
}

/** Resuelve ISO-2 para analytics: headers de CDN primero, luego lookup por IP (VPS self-hosted). */
export async function resolveAnalyticsCountryCode(
	headers: Headers,
	ip: string | null,
): Promise<string | null> {
	const fromHeader = countryFromHeaders(headers);
	if (fromHeader) return fromHeader;
	if (!ip) return null;
	return lookupCountryByIp(ip);
}
