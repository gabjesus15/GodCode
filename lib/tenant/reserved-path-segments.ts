/** Primer segmento de path que no corresponde a un tenant en el dominio principal. */
export const MAIN_DOMAIN_RESERVED_PATH_SEGMENTS = new Set([
	"login",
	"dashboard",
	"companies",
	"plans",
	"checkout",
	"onboarding",
	"api",
	"_next",
	"favicon.ico",
	"saas-admin",
	"addons",
	"plan-payment-methods",
	"herramientas",
	"tickets",
	"cuenta",
	"fonts",
	"brand",
	"tenant",
	"tenant-hero",
	"sobre-godcode",
	"images",
	"post-login",
]);

export function resolveTenantSlugFromPathname(pathname: string): string | null {
	const pathOnly = pathname.split("?")[0] || pathname;
	const segments = pathOnly.split("/").filter(Boolean);
	if (segments.length === 0) return null;

	const first = segments[0]?.toLowerCase();
	if (!first || first.includes(".") || MAIN_DOMAIN_RESERVED_PATH_SEGMENTS.has(first)) {
		return null;
	}

	return segments[0];
}
