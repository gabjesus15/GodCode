import { getAppUrl } from "@/lib/tenant/app-url";

export type PoweredBySurface = "menu" | "home" | "sidebar";

/** Landing de marketing con UTM para atribuir tráfico desde storefronts. */
export function buildPoweredByHref(opts: {
	tenantSlug?: string | null;
	surface: PoweredBySurface;
}): string {
	const base = getAppUrl().replace(/\/$/, "");
	const campaign = (opts.tenantSlug ?? "").trim().toLowerCase() || "unknown";
	const params = new URLSearchParams({
		utm_source: "tenant_powered_by",
		utm_medium: opts.surface,
		utm_campaign: campaign,
	});
	return `${base}/?${params.toString()}`;
}
