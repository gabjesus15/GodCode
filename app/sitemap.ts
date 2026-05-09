import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/tenant/app-url";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { createSupabasePublicServerClient } from "../utils/supabase/server";

const DEFAULT_SITEMAP_LAST_MODIFIED = "2026-04-30T00:00:00.000Z";

function getSitemapLastModified(): Date {
  const fromEnv = process.env.NEXT_PUBLIC_SITEMAP_LAST_MODIFIED?.trim();
  const date = fromEnv ? new Date(fromEnv) : new Date(DEFAULT_SITEMAP_LAST_MODIFIED);
  return Number.isNaN(date.getTime()) ? new Date(DEFAULT_SITEMAP_LAST_MODIFIED) : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const lastModified = getSitemapLastModified();
  const supabase = createSupabasePublicServerClient();
  const localizedLandingUrls: MetadataRoute.Sitemap = SUPPORTED_LOCALES
    .filter((locale) => locale !== "es")
    .map((locale) => ({
      url: `${base}/?hl=${locale}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  const localizedAboutUrls: MetadataRoute.Sitemap = [
    {
      url: `${base}/sobre-godcode?hl=en`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ];

  // Obtener todos los subdominios activos de la base de datos
  const { data: companies } = await supabase
    .from("companies")
    .select("public_slug,custom_domain")
    .eq("subscription_status", "active");

  const normalizeTenantOrigin = (company: {
    public_slug: string;
    custom_domain?: string | null;
  }): string => {
    const customDomain = String(company.custom_domain ?? "").trim();
    if (customDomain.length > 0) {
      const host = customDomain
        .replace(/^https?:\/\//i, "")
        .replace(/\/$/, "");
      return `https://${host}`;
    }
    return `https://${company.public_slug}.godcode.me`;
  };

  const tenantUrls: MetadataRoute.Sitemap = (companies ?? [])
    .filter(
      (c): c is { public_slug: string; custom_domain: string | null } =>
        typeof c.public_slug === "string" && c.public_slug.length > 0,
    )
    .flatMap((c) => {
      const origin = normalizeTenantOrigin(c);
      return [
        {
          url: `${origin}/`,
          lastModified,
          changeFrequency: "daily" as const,
          priority: 0.9,
        },
        {
          url: `${origin}/menu`,
          lastModified,
          changeFrequency: "daily" as const,
          priority: 0.8,
        },
      ];
    });

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/sobre-godcode`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    ...localizedAboutUrls,
    {
      url: `${base}/onboarding`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${base}/onboarding/negocios`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    ...localizedLandingUrls,
    ...tenantUrls,
  ];
}
