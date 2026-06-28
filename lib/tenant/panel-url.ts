import { getAppUrl } from "./app-url";

export function resolveTenantPanelLoginUrl(publicSlug: string | null): string {
	if (!publicSlug) return "/login?error=no-access";
	const baseDomain = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim()
		.replace(/^https?:\/\//, "")
		.replace(/\/$/, "");
	if (!baseDomain) return `/${publicSlug}/login`;
	const protocol = process.env.NEXT_PUBLIC_TENANT_PROTOCOL?.trim() || "https";
	return `${protocol}://${publicSlug}.${baseDomain}/login`;
}

export function resolveCustomerPortalUrl(path = "/cuenta"): string {
	const base = getAppUrl().replace(/\/$/, "");
	const normalized = path.startsWith("/") ? path : `/${path}`;
	return `${base}${normalized}`;
}
