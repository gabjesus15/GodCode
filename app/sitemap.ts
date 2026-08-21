import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/tenant/app-url";
import { createSupabasePublicServerClient } from "../utils/supabase/server";

/** Actualizar al desplegar cambios de marketing relevantes para incentivar recrawl. */
const DEFAULT_SITEMAP_LAST_MODIFIED = "2026-08-14T00:00:00.000Z";

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
		.select("public_slug,custom_domain,updated_at")
		.eq("subscription_status", "active");

	const tenantUrls: MetadataRoute.Sitemap = (companies ?? [])
		.filter(
			(c): c is { public_slug: string; custom_domain: string | null; updated_at: string | null } =>
				typeof c.public_slug === "string" &&
				c.public_slug.length > 0 &&
				!String(c.custom_domain ?? "").trim(),
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
