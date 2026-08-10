import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import { isMainDomain, getTenantSubdomainOrigin } from "@/lib/tenant/main-domain-host";
import { buildTenantThemeCssString } from "@/lib/store-theme/apply-theme-css-vars";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedCompany } from "../../utils/tenant-cache";
import "./styles/TenantUiPrimitives.css";
import "./styles/index.css";
import "./tenant-outfit.css";
import "./tenant-base.css";
import { TenantShell } from "../../components/tenant/shell/tenant-shell";
import { QueryProvider } from "@/components/ui/query-provider";
import { resolveStorefrontThemeAssets } from "@/lib/storage/storefront-branding";
import { buildTenantStorefrontDescription } from "@/lib/tenant/seo-metadata";

export const revalidate = 60; // ISR: regenera cada 60 segundos → HTML pre-renderizado para Googlebot


export async function generateViewport({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Viewport> {
  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);
  const rawThemeConfig = company?.theme_config;
  const parsedThemeConfig =
    typeof rawThemeConfig === "string"
      ? (() => {
          try {
            return JSON.parse(rawThemeConfig) as TenantThemeConfig;
          } catch {
            return {} as TenantThemeConfig;
          }
        })()
      : ((rawThemeConfig as unknown as TenantThemeConfig) ?? {});
  
  const backgroundColor = parsedThemeConfig.backgroundColor ?? "#0a0a0a";

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: backgroundColor,
  };
}

interface TenantLayoutProps {
  children: ReactNode;
  params: Promise<{ subdomain: string }>;
}

function formatBusinessNameFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

interface TenantThemeConfig {
  displayName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  priceColor?: string;
  discountColor?: string;
  hoverColor?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  logoUrl?: string;
  imageUrl?: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const hdrs = await headers();
  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);
  const host =
    hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    hdrs.get("host") ??
    `${resolvedParams.subdomain}.godcode.me`;
  const protocol = hdrs.get("x-forwarded-proto") ?? "https";

  const baseOrigin = `${protocol}://${host}`;
  const metadataBase = new URL(baseOrigin);
  const onApexPathTenant = isMainDomain(host);
  const pathPrefix = onApexPathTenant ? `/${resolvedParams.subdomain}` : "";
  const subdomainOrigin = getTenantSubdomainOrigin(resolvedParams.subdomain);

  if (!company) {
    return { title: { absolute: "GodCode | Menú Digital" } };
  }

  const status = company.subscription_status?.toLowerCase();
  if (status === "suspended" || status === "cancelled") {
    return { title: { absolute: "GodCode" } };
  }

  const rawThemeConfig = company.theme_config;
  const parsedThemeConfig =
    typeof rawThemeConfig === "string"
      ? (() => {
          try {
            return JSON.parse(rawThemeConfig) as TenantThemeConfig;
          } catch {
            return {} as TenantThemeConfig;
          }
        })()
      : ((rawThemeConfig as unknown as TenantThemeConfig) ?? {});
  const theme = parsedThemeConfig;
  const slugFallback = formatBusinessNameFromSlug(resolvedParams.subdomain);
  const name =
    (typeof theme.displayName === "string" && theme.displayName.trim().length > 0
      ? theme.displayName.trim()
      : company.name?.trim()) || slugFallback || "GodCode";
  const versionSeed = tenantBrandingIconVersionSeed(company);
  const icon = `/tenant-favicon?tenant=${encodeURIComponent(resolvedParams.subdomain)}&v=${encodeURIComponent(versionSeed)}`;
  const description = buildTenantStorefrontDescription({
    displayName: name,
    address: company.address,
    country: company.country,
  });

  const canonical = onApexPathTenant ? `${subdomainOrigin}/` : `${baseOrigin}${pathPrefix}/`;
  const ogUrl = canonical;

  return {
    metadataBase,
    alternates: {
      canonical,
    },
    title: {
      absolute: name,
      template: `%s | ${name}`,
    },
    description: description,
    keywords: [name, "menú digital", "pedidos online", "delivery", "carta online", resolvedParams.subdomain],
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
    },
    openGraph: {
      title: name,
      description: description,
      type: 'website',
      siteName: name,
      url: ogUrl,
      images: [
        {
          url: `${pathPrefix}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `Menú de ${name}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description: description,
    },
    robots: onApexPathTenant
      ? {
          index: false,
          follow: true,
        }
      : {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
  };
}


export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const hdrs = await headers();
  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);
  const storedTheme = normalizeStoreThemeConfig(company?.theme_config, company?.name ?? "");
  const theme = company?.id
    ? await resolveStorefrontThemeAssets(storedTheme, String(company.id))
    : storedTheme;
  const host =
    hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    hdrs.get("host") ??
    `${resolvedParams.subdomain}.godcode.me`;
  const protocol = hdrs.get("x-forwarded-proto") ?? "https";
  const pathPrefix = isMainDomain(host) ? `/${resolvedParams.subdomain}` : "";
  const baseUrl = `${protocol}://${host}${pathPrefix}`;

  const tenantThemeCss = buildTenantThemeCssString(theme);

  const businessDescription = buildTenantStorefrontDescription({
    displayName: theme.displayName ?? company?.name ?? "GodCode",
    address: company?.address,
    country: company?.country,
  });

  // Datos estructurados LocalBusiness/Restaurant (Mucho más potentes para SEO local)
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": theme.displayName ?? company?.name,
    "url": baseUrl,
    "logo": theme.logoUrl,
    "image": `${baseUrl}/opengraph-image`,
    "description": businessDescription,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": company?.address,
      "addressCountry": company?.country || "CL"
    },
    "servesCuisine": "International",
    "hasMenu": `${baseUrl}/menu`,
    "acceptsReservations": "False",
    "priceRange": "$$"
  };

  const isMain = isMainDomain(host);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": isMain
      ? [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "GodCode",
            "item": "https://www.godcode.me"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": theme.displayName ?? company?.name ?? "Menú",
            "item": baseUrl
          }
        ]
      : [
          {
            "@type": "ListItem",
            "position": 1,
            "name": theme.displayName ?? company?.name ?? "Menú",
            "item": baseUrl
          }
        ]
  };

  return (
    <QueryProvider>
      {/* Datos estructurados Restaurant */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }} />
      {/* BreadcrumbList para rich results */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <style>{tenantThemeCss}</style>
      <div className="tenant-theme-vars">
        <TenantShell>{children}</TenantShell>
      </div>
    </QueryProvider>
  );
}

