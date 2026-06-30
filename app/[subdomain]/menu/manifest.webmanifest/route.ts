import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedCompany } from "../../../../utils/tenant-cache";

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

	const status = company?.subscription_status?.toLowerCase();
	const isUnavailable = status === "suspended" || status === "cancelled";

	const name =
		isUnavailable
			? "GodCode Menu"
			: (company?.theme_config?.displayName as string) ??
				company?.name ??
				"GodCode Menu";

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
		background_color:
			(company?.theme_config?.backgroundColor as string) ?? "#0a0a0a",
		theme_color: (company?.theme_config?.primaryColor as string) ?? "#111827",
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
