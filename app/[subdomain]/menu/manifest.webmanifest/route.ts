import { NextResponse } from "next/server";

import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedCompany } from "../../../../utils/tenant-cache";

type RouteContext = {
	params: Promise<{ subdomain: string }>;
};

export async function GET(req: Request, context: RouteContext) {
	const { subdomain } = await context.params;
	const company = await getCachedCompany(subdomain);

	let baseUrl = "";
	try {
		baseUrl = new URL(req.url).origin;
	} catch {
		baseUrl = "";
	}
	const pathPrefix = baseUrl ? `${baseUrl}/${subdomain}` : `/${subdomain}`;

	const status = company?.subscription_status?.toLowerCase();
	const isUnavailable = status === "suspended" || status === "cancelled";

	const name =
		isUnavailable
			? "GodCode Menu"
			: (company?.theme_config?.displayName as string) ??
				company?.name ??
				"GodCode Menu";

	const iconVersion = encodeURIComponent(
		company ? tenantBrandingIconVersionSeed(company) : String(name)
	);
	const tenantIcon = baseUrl ? `${baseUrl}/tenant-favicon?v=${iconVersion}` : `/tenant-favicon?v=${iconVersion}`;
	const startUrl = baseUrl ? `${pathPrefix}/menu` : `/${subdomain}/menu`;
	const scope = pathPrefix;

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
		},
	});
}
