export type ProxyMode = "off" | "on" | "proxy_only";

function resolveProxyMode(): ProxyMode {
	const raw = (process.env.FF_ONBOARDING_BILLING_EXTERNAL ?? "").trim().toLowerCase();
	if (raw === "proxy_only") return "proxy_only";
	if (raw === "true") return "on";
	return "off";
}

export const flags = {
	ONBOARDING_BILLING_EXTERNAL: resolveProxyMode() !== "off",
	ONBOARDING_BILLING_MODE: resolveProxyMode(),
} as const;

/** `localhost`, `127.0.0.1` o `::1`: en producción el microservicio no puede apuntar ahí. */
export function isLoopbackHostname(hostname: string): boolean {
	const value = hostname.trim().toLowerCase();
	return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

export function getOnboardingBillingBaseUrl(): string {
	const raw = process.env.ONBOARDING_BILLING_SERVICE_URL?.trim() ?? "";
	if (!raw) return "";

	// Allow values wrapped in quotes from env dashboards.
	const unquoted =
		(raw.startsWith('"') && raw.endsWith('"')) ||
		(raw.startsWith("'") && raw.endsWith("'"))
			? raw.slice(1, -1).trim()
			: raw;

	const clean = unquoted.replace(/\/$/, "");
	if (!clean) return "";

	if (/^https?:\/\//i.test(clean)) return clean;

	// If protocol is omitted, default to http for loopback and https for public hosts.
	if (/^(localhost|127\.0\.0\.1|::1)(:\d+)?(\/.*)?$/i.test(clean)) {
		return `http://${clean}`.replace(/\/$/, "");
	}

	if (/^[a-z0-9.-]+(:\d+)?(\/.*)?$/i.test(clean)) {
		return `https://${clean}`.replace(/\/$/, "");
	}

	return clean;
}
