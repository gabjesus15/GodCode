import { getSubdomainFromHost, isMainDomain } from "@/lib/tenant/main-domain-host";
import { resolveTenantSlugFromCustomDomainHost } from "@/lib/tenant/custom-domain-resolve";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";

import { normalizeLocale, type AppLocale } from "./config";

type CompanyThemeConfigLike = {
  locale?: unknown;
  language?: unknown;
  businessLocale?: unknown;
};

const COUNTRY_TO_LOCALE: Record<string, AppLocale> = {
  ar: "es",
  bo: "es",
  br: "pt",
  cl: "es",
  co: "es",
  cr: "es",
  cu: "es",
  de: "de",
  do: "es",
  ec: "es",
  es: "es",
  fr: "fr",
  gt: "es",
  hn: "es",
  it: "it",
  mx: "es",
  ni: "es",
  pa: "es",
  pe: "es",
  pr: "es",
  pt: "pt",
  py: "es",
  sv: "es",
  uy: "es",
  ve: "es",

  argentina: "es",
  bolivia: "es",
  brasil: "pt",
  brazil: "pt",
  chile: "es",
  colombia: "es",
  costa_rica: "es",
  cuba: "es",
  ecuador: "es",
  espana: "es",
  spain: "es",
  france: "fr",
  francia: "fr",
  germany: "de",
  alemania: "de",
  guatemala: "es",
  honduras: "es",
  italia: "it",
  italy: "it",
  mexico: "es",
  nicaragua: "es",
  panama: "es",
  paraguay: "es",
  peru: "es",
  portugal: "pt",
  puerto_rico: "es",
  republica_dominicana: "es",
  dominican_republic: "es",
  el_salvador: "es",
  uruguay: "es",
  venezuela: "es",
};

const ENGLISH_FALLBACK_COUNTRIES = new Set<string>([
  "au",
  "ca",
  "gb",
  "ie",
  "in",
  "nz",
  "sg",
  "uk",
  "us",
  "za",
  "australia",
  "canada",
  "india",
  "ireland",
  "new_zealand",
  "singapore",
  "south_africa",
  "united_kingdom",
  "united_states",
]);

function normalizeCountry(country: unknown): string {
  return String(country ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveLocaleFromCountry(country: unknown): AppLocale | null {
  const normalized = normalizeCountry(country);
  if (!normalized) return null;

  const direct = COUNTRY_TO_LOCALE[normalized];
  if (direct) return direct;

  if (ENGLISH_FALLBACK_COUNTRIES.has(normalized)) return "en";
  return "es";
}

function resolveLocaleFromThemeConfig(themeConfig: unknown): AppLocale | null {
  if (!themeConfig || typeof themeConfig !== "object" || Array.isArray(themeConfig)) {
    return null;
  }

  const cfg = themeConfig as CompanyThemeConfigLike;
  const candidates = [cfg.locale, cfg.language, cfg.businessLocale];

  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate);
    const raw = String(candidate ?? "").trim();
    if (raw && normalized) {
      return normalized;
    }
  }

  return null;
}

async function resolveLocaleBySlug(slug: string): Promise<AppLocale | null> {
  const supabase = createSupabasePublicServerClient();
  const { data: company } = await supabase
    .from("companies")
    .select("country,theme_config")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!company) return null;

  const localeFromBusiness = resolveLocaleFromThemeConfig(company.theme_config);
  if (localeFromBusiness) return localeFromBusiness;

  return resolveLocaleFromCountry(company.country);
}

export async function resolveTenantPreferredLocale(
  headersOrHost: Headers | string | null
): Promise<AppLocale | null> {
  if (!headersOrHost) return null;

  let hostHeader: string | null = null;
  let tenantSlugHeader: string | null = null;

  if (typeof headersOrHost === "string") {
    hostHeader = headersOrHost;
  } else if (typeof headersOrHost.get === "function") {
    hostHeader = headersOrHost.get("host");
    tenantSlugHeader = headersOrHost.get("x-tenant-slug");
  }

  if (tenantSlugHeader) {
    const locale = await resolveLocaleBySlug(tenantSlugHeader);
    if (locale) return locale;
  }

  if (!hostHeader) return null;
  if (isMainDomain(hostHeader)) return null;

  const subdomain = getSubdomainFromHost(hostHeader);
  const slug = subdomain ?? (await resolveTenantSlugFromCustomDomainHost(hostHeader));
  if (!slug) return null;

  return resolveLocaleBySlug(slug);
}
