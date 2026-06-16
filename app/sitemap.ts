import type { MetadataRoute } from "next";
import { getAppUrl } from "@/lib/tenant/app-url";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { createSupabasePublicServerClient } from "../utils/supabase/server";

const DEFAULT_SITEMAP_LAST_MODIFIED = "2026-06-15T00:00:00.000Z";

function getSitemapLastModified(): Date {
  const fromEnv = process.env.NEXT_PUBLIC_SITEMAP_LAST_MODIFIED?.trim();
  const date = fromEnv ? new Date(fromEnv) : new Date(DEFAULT_SITEMAP_LAST_MODIFIED);
  return Number.isNaN(date.getTime()) ? new Date(DEFAULT_SITEMAP_LAST_MODIFIED) : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getAppUrl();
  const lastModified = getSitemapLastModified();
  const supabase = createSupabasePublicServerClient();

  // Variantes localizadas de la landing (excluye "es" que ya es la URL canónica raíz)
  const localizedLandingUrls: MetadataRoute.Sitemap = SUPPORTED_LOCALES
    .filter((locale) => locale !== "es")
    .map((locale) => ({
      url: `${base}/?hl=${locale}`,
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  // Variantes localizadas de sobre-godcode
  const localizedAboutUrls: MetadataRoute.Sitemap = [
    {
      url: `${base}/sobre-godcode?hl=en`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
  ];

  // Obtener todos los negocios activos de la base de datos
  const { data: companies } = await supabase
    .from("companies")
    .select("public_slug,custom_domain")
    .eq("subscription_status", "active");

  // Solo incluir tenants SIN dominio custom en el sitemap de godcode.me.
  // Google no permite que un sitemap incluya URLs de dominios externos.
  // Los tenants con dominio custom (ej: oishisushi.shop) necesitarían
  // su propio sitemap en su propio dominio.
  const tenantUrls: MetadataRoute.Sitemap = (companies ?? [])
    .filter(
      (c): c is { public_slug: string; custom_domain: string | null } =>
        typeof c.public_slug === "string" &&
        c.public_slug.length > 0 &&
        !String(c.custom_domain ?? "").trim(), // excluir tenants con dominio custom
    )
    .flatMap((c) => {
      const origin = `https://${c.public_slug}.godcode.me`;
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
    // Página principal (prioridad máxima)
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    // Sobre GodCode
    {
      url: `${base}/sobre-godcode`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    // Onboarding — landing de registro (indexable)
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
    // NOTA: /onboarding/terminos y /onboarding/privacidad tienen robots noindex
    // intencionalmente y NO se incluyen en el sitemap para evitar señales contradictorias.
    ...localizedAboutUrls,
    ...localizedLandingUrls,
    ...tenantUrls,
  ];
}
