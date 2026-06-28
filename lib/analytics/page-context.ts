import { getSubdomainFromHost, isMainDomain } from "@/lib/tenant/main-domain-host";
import { resolveTenantSlugFromPathname } from "@/lib/tenant/reserved-path-segments";

export type AnalyticsPageType = "landing" | "tenant" | "saas" | "unknown";

export type AnalyticsPageContext = {
	pageType: AnalyticsPageType;
	tenantSlug: string | null;
};

function normalizeHost(rawHost: string | null | undefined): string {
	const host = (rawHost || "").split(":")[0].trim().toLowerCase();
	if (host.startsWith("www.")) return host.slice(4);
	return host;
}

export function resolveAnalyticsPageContext(input: {
	pathname: string;
	host?: string | null;
}): AnalyticsPageContext {
	const host = normalizeHost(input.host ?? null);
	const pathOnly = (input.pathname.split("?")[0] || "/").trim() || "/";

	if (host && isMainDomain(host)) {
		const slugFromPath = resolveTenantSlugFromPathname(pathOnly);
		if (slugFromPath) {
			return { pageType: "tenant", tenantSlug: slugFromPath };
		}
		if (pathOnly === "/" || pathOnly.startsWith("/landing")) {
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
