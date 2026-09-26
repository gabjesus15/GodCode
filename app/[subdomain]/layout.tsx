import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { buildTenantThemeCssString } from "@/lib/store-theme/apply-theme-css-vars";
import { buildTenantSurfaceCssString, resolveTenantSurfaceSchemeAttr, resolveTenantSurfaceSchemeMode } from "@/lib/store-theme/surface-theme";
import { normalizeStoreThemeConfig } from "@/lib/store-theme/theme-config";
import { readThemeConfigObject } from "@/lib/store-theme/merge-theme-config";
import { sanitizeHexColor } from "@/lib/store-theme/apply-theme-css-vars";
import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { readHomePageConfig } from "@/lib/tenant/home-page/home-page-config";
import { buildTenantShareImage } from "@/lib/tenant/share-card/share-image-metadata";
import { getCachedCompany } from "../../utils/tenant-cache";
import "./styles/TenantUiPrimitives.css";
import "./styles/index.css";
import "./tenant-base.css";
import { TenantShell } from "../../components/tenant/shell/tenant-shell";
import { QueryProvider } from "@/components/ui/query-provider";
import { resolveStorefrontThemeAssets } from "@/lib/storage/storefront-branding";
import { buildTenantStorefrontDescription, resolveTenantDisplayName } from "@/lib/tenant/seo-metadata";
import { serializeJsonLd } from "@/lib/seo/serialize-json-ld";
import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";

export const revalidate = 60; // ISR: regenera cada 60 segundos → HTML pre-renderizado para Googlebot


export async function generateViewport({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Viewport> {
  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);
  const theme = readThemeConfigObject(company?.theme_config);
  const backgroundColor = sanitizeHexColor(
    typeof theme.backgroundColor === "string" ? theme.backgroundColor : "",
    "#0a0a0a",
  );

  return {
    width: "device-width",
    initialScale: 1,
    /**
     * Sin `maximumScale: 1` ni `userScalable: false`.
     *
     * Bloqueaban el zoom con pellizco, que es un fallo de WCAG 1.4.4 (AA) y en
     * una carta duele especialmente: es el gesto con el que alguien con vista
     * cansada lee la descripcion de un plato o mira bien la foto. El motivo
     * habitual para bloquearlo — evitar el zoom accidental al tocar dos veces —
     * ya lo cubren los `touch-action: manipulation` de los controles.
     */
    themeColor: backgroundColor,
  };
}

interface TenantLayoutProps {
  children: ReactNode;
  params: Promise<{ subdomain: string }>;
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

  if (!company) {
    return { title: { absolute: "Gcode POS | Menú Digital" } };
  }

  // Misma regla en todo lo público: una cancelación sigue online hasta el vencimiento y
  // un plan vencido se corta aunque el cron todavía no lo haya suspendido.
  if (!isTenantSubscriptionAccessible(company)) {
    return { title: { absolute: "Gcode POS" } };
  }

  const name = resolveTenantDisplayName(company, { slug: resolvedParams.subdomain });
  const versionSeed = tenantBrandingIconVersionSeed(company);
  const icon = `/tenant-favicon?tenant=${encodeURIComponent(resolvedParams.subdomain)}&v=${encodeURIComponent(versionSeed)}`;
  const description = buildTenantStorefrontDescription({
    displayName: name,
    address: company.address,
    country: company.country,
  });

  // Canonical propio de cada URL servida: los subdominios *.godcode.me no existen en DNS,
  // los tenants se sirven por path (godcode.me/{slug}) y deben indexarse tal cual.
  // Si el negocio tiene dominio personalizado, consolidar el SEO en ese dominio.
  const customDomain =
    typeof company.custom_domain === "string" ? company.custom_domain.trim() : "";
  const canonical = customDomain
    ? `https://${customDomain}/`
    : `${baseOrigin}${pathPrefix}/`;
  const ogUrl = canonical;
  // Al compartir, la frase del local (si la escribió) dice más que la genérica.
  const bio = readHomePageConfig(company.theme_config).bio.trim();
  const shareDescription = bio ? `${bio} · Menú digital y pedidos online.` : description;
  const shareImage = buildTenantShareImage({ pathPrefix, versionSeed, name });

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
      description: shareDescription,
      type: 'website',
      siteName: name,
      url: ogUrl,
      images: [shareImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: name,
      description: shareDescription,
      images: [shareImage],
    },
    robots: {
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
  // Modo, tipografía y color del nombre: bloque aparte, fuera del contrato compartido.
  const tenantSurfaceCss = buildTenantSurfaceCssString(theme);
  const tenantSurfaceScheme = resolveTenantSurfaceSchemeAttr(theme);
  const tenantSurfaceSchemeMode = resolveTenantSurfaceSchemeMode(theme);

  const businessDescription = buildTenantStorefrontDescription({
    displayName: theme.displayName ?? company?.name ?? "Gcode",
    address: company?.address,
    country: company?.country,
  });

  // Datos estructurados LocalBusiness/Restaurant (Mucho más potentes para SEO local)
  const businessName =
    (typeof theme.displayName === "string" && theme.displayName.trim()) ||
    company?.name?.trim() ||
    "Gcode";
  // Logo con URL estable: la signed URL de Storage expira en 12 h y Google no podría descargarlo.
  const stableLogoUrl = company
    ? `${protocol}://${host}/tenant-favicon?tenant=${encodeURIComponent(resolvedParams.subdomain)}&v=${encodeURIComponent(tenantBrandingIconVersionSeed(company))}&size=192`
    : null;
  // Con dominio personalizado, los datos estructurados apuntan a ese dominio (consolidación SEO).
  const customDomain =
    typeof company?.custom_domain === "string" ? company.custom_domain.trim() : "";
  const businessUrl = customDomain ? `https://${customDomain}/` : baseUrl;
  const businessJsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "name": businessName,
    "url": businessUrl,
    ...(stableLogoUrl ? { "logo": stableLogoUrl } : {}),
    ...(company
      ? {
          "image": `${baseUrl}${buildTenantShareImage({ pathPrefix: "", versionSeed: tenantBrandingIconVersionSeed(company), name: businessName }).url}`,
        }
      : {}),
    "description": businessDescription,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": company?.address,
      "addressCountry": company?.country || "CL"
    },
    "servesCuisine": "International",
    "hasMenu": `${businessUrl}menu`,
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
            "name": "Gcode Labs",
            "item": "https://www.godcode.me"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": businessName,
            "item": businessUrl
          }
        ]
      : [
          {
            "@type": "ListItem",
            "position": 1,
            "name": businessName,
            "item": businessUrl
          }
        ]
  };

  return (
    <QueryProvider>
      {/* Datos estructurados Restaurant */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(businessJsonLd) }} />
      {/* BreadcrumbList para rich results */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }} />
      <style>{tenantThemeCss}</style>
      <style>{tenantSurfaceCss}</style>
      <div className="tenant-theme-vars" data-scheme={tenantSurfaceScheme} data-scheme-mode={tenantSurfaceSchemeMode}>
        <TenantShell>{children}</TenantShell>
      </div>
    </QueryProvider>
  );
}

