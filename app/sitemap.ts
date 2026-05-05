import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/tenant/app-url";

const DEFAULT_SITEMAP_LAST_MODIFIED = "2026-04-30T00:00:00.000Z";

function getSitemapLastModified(): Date {
  const fromEnv = process.env.NEXT_PUBLIC_SITEMAP_LAST_MODIFIED?.trim();
  const date = fromEnv ? new Date(fromEnv) : new Date(DEFAULT_SITEMAP_LAST_MODIFIED);
  return Number.isNaN(date.getTime()) ? new Date(DEFAULT_SITEMAP_LAST_MODIFIED) : date;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getAppUrl();
  const lastModified = getSitemapLastModified();

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
  ];
}
