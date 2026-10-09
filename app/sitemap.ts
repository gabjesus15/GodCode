import type { MetadataRoute } from "next";
import { LANDING_COUNTRY_SLUGS } from "@/lib/landing/countries";
import { isPubliclyListedCompany } from "@/lib/seo/public-tenant-listing";
import { getAppUrl } from "@/lib/tenant/app-url";
import { createSupabasePublicServerClient } from "../utils/supabase/server";

/** Actualizar al desplegar cambios de marketing relevantes para incentivar recrawl. */
const DEFAULT_SITEMAP_LAST_MODIFIED = "2026-10-08T00:00:00.000Z";

function getMarketingLastModified(): Date {
	const fromEnv = process.env.NEXT_PUBLIC_SITEMAP_LAST_MODIFIED?.trim();
	if (fromEnv) {
		const date = new Date(fromEnv);
		if (!Number.isNaN(date.getTime())) return date;
	}
	return new Date(DEFAULT_SITEMAP_LAST_MODIFIED);
}

function getTenantLastModified(updatedAt: string | null | undefined, fallback: Date): Date {
	if (!updatedAt) return fallback;
	const date = new Date(updatedAt);
	return Number.isNaN(date.getTime()) ? fallback : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const base = getAppUrl();
	const marketingLastModified = getMarketingLastModified();
	const supabase = createSupabasePublicServerClient();

	const { data: companies } = await supabase
		.from("companies")
		// `plans(features)` trae `product_mode`: los negocios «solo panel CEO» no tienen menú público.
		.select("public_slug,custom_domain,updated_at,plans:plans(features)")
		.eq("subscription_status", "active");

	const tenantUrls: MetadataRoute.Sitemap = (companies ?? [])
		.filter(
			(c): c is typeof c & { public_slug: string } =>
				isPubliclyListedCompany(c) && !String(c.custom_domain ?? "").trim(),
		)
		.flatMap((c) => {
			// Tenants se sirven por path en el dominio principal (godcode.me/{slug});
			// los subdominios *.godcode.me no existen en DNS y generaban URLs rotas.
			const lastModified = getTenantLastModified(c.updated_at, marketingLastModified);
			return [
				{
					url: `${base}/${c.public_slug}`,
					lastModified,
					changeFrequency: "daily" as const,
					priority: 0.9,
				},
				{
					url: `${base}/${c.public_slug}/menu`,
					lastModified,
					changeFrequency: "daily" as const,
					priority: 0.8,
				},
			];
		});

	return [
		{
			url: `${base}/`,
			lastModified: marketingLastModified,
			changeFrequency: "weekly",
			priority: 1,
		},
		{
			url: `${base}/sobre-godcode`,
			lastModified: marketingLastModified,
			changeFrequency: "monthly",
			priority: 0.8,
		},
		// Páginas de país: compiten por «menú digital Chile» y «sistema para restaurantes Venezuela».
		...LANDING_COUNTRY_SLUGS.map((slug) => ({
			url: `${base}/${slug}`,
			lastModified: marketingLastModified,
			changeFrequency: "monthly" as const,
			priority: 0.9,
		})),
		{
			url: `${base}/calculadora-comisiones`,
			lastModified: marketingLastModified,
			changeFrequency: "monthly",
			priority: 0.8,
		},
		{
			url: `${base}/onboarding`,
			lastModified: marketingLastModified,
			changeFrequency: "monthly",
			priority: 0.9,
		},
		{
			url: `${base}/onboarding/negocios`,
			lastModified: marketingLastModified,
			changeFrequency: "weekly",
			priority: 0.7,
		},
		...tenantUrls,
	];
}
