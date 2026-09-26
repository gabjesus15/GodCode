import { getSubdomainFromHost, isMainDomain } from "@/lib/tenant/main-domain-host";
import { resolveTenantSlugFromPathname } from "@/lib/tenant/reserved-path-segments";

export type AnalyticsPageType = "landing" | "tenant" | "saas" | "unknown";

export type AnalyticsPageContext = {
	pageType: AnalyticsPageType;
	tenantSlug: string | null;
};

/** Host sin puerto ni `www.`, en minúsculas (cadena vacía si no llega). */
export function normalizeAnalyticsHost(rawHost: string | null | undefined): string {
	const host = (rawHost || "").split(":")[0].trim().toLowerCase();
	if (host.startsWith("www.")) return host.slice(4);
	return host;
}

/**
 * Paneles internos (super admin, portal de dueños, login): no son tráfico de clientes y
 * no se registran. Solo el primer segmento, salvo /onboarding (público) vs /onboarding/solicitudes.
 */
const INTERNAL_FIRST_SEGMENTS = new Set([
	"dashboard",
	"companies",
	"plans",
	"addons",
	"plan-payment-methods",
	"herramientas",
	"tickets",
	"landing",
	"cuenta",
	"login",
	"post-login",
	"saas-admin",
]);

export function isInternalAnalyticsPath(pathname: string): boolean {
	const segments = (pathname.split("?")[0] || "/").split("/").filter(Boolean).map((s) => s.toLowerCase());
	if (segments.length === 0) return false;
	if (segments[0] === "onboarding" && segments[1] === "solicitudes") return true;
	return INTERNAL_FIRST_SEGMENTS.has(segments[0]);
}

/** Pruebas locales o e2e contra la base de producción: no cuentan como visitas. */
export function isLocalAnalyticsHost(rawHost: string | null | undefined): boolean {
	const host = normalizeAnalyticsHost(rawHost);
	return host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost");
}

export function resolveAnalyticsPageContext(input: {
	pathname: string;
	host?: string | null;
}): AnalyticsPageContext {
	const host = normalizeAnalyticsHost(input.host ?? null);
	const pathOnly = (input.pathname.split("?")[0] || "/").trim() || "/";

	if (host && isMainDomain(host)) {
		const slugFromPath = resolveTenantSlugFromPathname(pathOnly);
		if (slugFromPath) {
			return { pageType: "tenant", tenantSlug: slugFromPath };
		}
		if (pathOnly === "/") {
			return { pageType: "landing", tenantSlug: null };
		}
		return { pageType: "saas", tenantSlug: null };
	}

	if (host) {
		const bySubdomain = getSubdomainFromHost(host);
		if (bySubdomain) {
			return { pageType: "tenant", tenantSlug: bySubdomain };
		}
		return { pageType: "tenant", tenantSlug: null };
	}

	return { pageType: "unknown", tenantSlug: null };
}
