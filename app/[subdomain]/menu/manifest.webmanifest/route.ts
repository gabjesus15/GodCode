import { headers } from "next/headers";
import { sanitizeHexColor } from "@/lib/store-theme/apply-theme-css-vars";
import { readThemeConfigObject } from "@/lib/store-theme/merge-theme-config";
import { resolveTenantDisplayName } from "@/lib/tenant/seo-metadata";
import { NextResponse } from "next/server";

import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedCompany } from "../../../../utils/tenant-cache";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";

type RouteContext = {
	params: Promise<{ subdomain: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
	const { subdomain } = await context.params;
	const company = await getCachedCompany(subdomain);

	const hdrs = await headers();
	const host =
		hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ??
		hdrs.get("host") ??
		"";

	const pathPrefix = isMainDomain(host) ? `/${subdomain}` : "";
	const startUrl = `${pathPrefix}/menu`;
	const scope = pathPrefix ? `${pathPrefix}/` : "/";

	const isUnavailable = !isTenantSubscriptionAccessible(company);

	const theme = readThemeConfigObject(company?.theme_config);
	// `??` no cubría el nombre vacío: el manifest salía con name y short_name "".
	const name = isUnavailable ? "Gcode Menu" : resolveTenantDisplayName(company, { slug: subdomain, fallback: "Gcode Menu" });

	const iconVersion = encodeURIComponent(
		company ? tenantBrandingIconVersionSeed(company) : String(name),
	);
	const tenantIcon = `/tenant-favicon?tenant=${encodeURIComponent(subdomain)}&v=${iconVersion}`;

	const manifest = {
		id: startUrl,
		name,
		short_name: name.slice(0, 24),
		description: `Menu digital de ${name}`,
		start_url: startUrl,
		scope,
		display: "standalone",
		background_color: sanitizeHexColor(typeof theme.backgroundColor === "string" ? theme.backgroundColor : "", "#0a0a0a"),
		theme_color: sanitizeHexColor(typeof theme.primaryColor === "string" ? theme.primaryColor : "", "#111827"),
		icons: [
			{
				src: tenantIcon,
				sizes: "192x192",
				purpose: "any maskable",
			},
			{
				src: tenantIcon,
				sizes: "512x512",
				purpose: "any maskable",
			},
		],
	};

	return NextResponse.json(manifest, {
		headers: {
			"Cache-Control": "public, max-age=300",
			"Content-Type": "application/manifest+json",
		},
	});
}
