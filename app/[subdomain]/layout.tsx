import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";

import { getAppUrl } from "@/lib/tenant/app-url";
import { isMainDomain } from "@/lib/tenant/main-domain-host";
import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedCompany } from "../../utils/tenant-cache";
import "./tenant.css";
import { TenantShell } from "../../components/tenant/shell/tenant-shell";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

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

const toRgba = (hex: string, alpha: number, fallback: string) => {
  if (!hex) return fallback;
  const normalized = hex.trim();
  const shortMatch = /^#([a-fA-F0-9]{3})$/.exec(normalized);
  const longMatch = /^#([a-fA-F0-9]{6})$/.exec(normalized);

  const hexValue = shortMatch
    ? shortMatch[1]
        .split("")
        .map((char) => char + char)
        .join("")
    : longMatch
      ? longMatch[1]
      : null;

  if (!hexValue) return fallback;

  const r = Number.parseInt(hexValue.slice(0, 2), 16);
  const g = Number.parseInt(hexValue.slice(2, 4), 16);
  const b = Number.parseInt(hexValue.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const sanitizeCssValue = (value: string) =>
  value.replace(/<|>|"|'|`/g, "").trim();

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
  const metadataBase = new URL(`${protocol}://${host}`);
  const pathPrefix = isMainDomain(host) ? `/${resolvedParams.subdomain}` : "";

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
  const icon = `${pathPrefix}/favicon.ico?v=${encodeURIComponent(versionSeed)}`;
  const description = `Pide online en ${name}. Consulta nuestro menu digital, precios y haz tu pedido por WhatsApp con delivery o retiro.`;
  const appHost = (() => {
    try {
      return new URL(getAppUrl()).host.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  const normalizedHost = host.replace(/^www\./i, "").toLowerCase();
  const normalizedCustom = String(company.custom_domain ?? "")
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "")
    .toLowerCase();
  const useSelfCanonical = normalizedCustom.length > 0 && normalizedHost === normalizedCustom;
  const canonical = useSelfCanonical
    ? `${metadataBase.origin}${pathPrefix}/`
    : pathPrefix && appHost && !appHost.includes("localhost")
      ? `https://${resolvedParams.subdomain}.${appHost}/`
      : `${metadataBase.origin}${pathPrefix}/`;

  return {
    metadataBase,
    alternates: {
      canonical,
    },
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description: description,
    keywords: [name, "menú digital", "pedidos online", "delivery", "carta online", resolvedParams.subdomain],
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
    openGraph: {
      title: name,
      description: description,
      type: 'website',
      siteName: name,
      url: `${metadataBase.origin}${pathPrefix}/`,
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
  };
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const hdrs = await headers();
  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);
  const theme = (company?.theme_config as unknown as TenantThemeConfig) ?? {};
  const host =
    hdrs.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    hdrs.get("host") ??
    `${resolvedParams.subdomain}.godcode.me`;
  const protocol = hdrs.get("x-forwarded-proto") ?? "https";
  const pathPrefix = isMainDomain(host) ? `/${resolvedParams.subdomain}` : "";
  const baseUrl = `${protocol}://${host}${pathPrefix}`;

  const primaryColor = theme.primaryColor ?? "#111827";
  const secondaryColor = theme.secondaryColor ?? primaryColor;
  const priceColor = theme.priceColor ?? "#ff4757";
  const discountColor = theme.discountColor ?? "#25d366";
  const hoverColor = theme.hoverColor ?? "#ff2e40";
  const accentShadow = toRgba(primaryColor, 0.3, "rgba(255, 71, 87, 0.3)");
  const accentShadowStrong = toRgba(
    primaryColor,
    0.5,
    "rgba(255, 71, 87, 0.5)"
  );
  const cardBorder = toRgba(primaryColor, 0.18, "rgba(255, 255, 255, 0.1)");
  const backgroundColor = theme.backgroundColor ?? "#0a0a0a";
  const backgroundImageUrl = theme.backgroundImageUrl ?? "/tenant/menu-pattern.webp";
  const backgroundImage = backgroundImageUrl
    ? `url(${backgroundImageUrl}), url(/tenant/menu-pattern.webp)`
    : "url(/tenant/menu-pattern.webp)";
  const tenantThemeCss = `.tenant-theme-vars{--tenant-primary:${sanitizeCssValue(primaryColor)};--accent-primary:${sanitizeCssValue(primaryColor)};--accent-secondary:${sanitizeCssValue(secondaryColor)};--price-color:${sanitizeCssValue(priceColor)};--discount-color:${sanitizeCssValue(discountColor)};--accent-hover:${sanitizeCssValue(hoverColor)};--accent-shadow:${sanitizeCssValue(accentShadow)};--accent-shadow-strong:${sanitizeCssValue(accentShadowStrong)};--card-border:${sanitizeCssValue(cardBorder)};--bg-primary:${sanitizeCssValue(backgroundColor)};--tenant-bg-image:${sanitizeCssValue(backgroundImage)};}`;

  const businessDescription = `Pide online en ${theme.displayName ?? company?.name ?? "GodCode"}. Consulta nuestro menu digital, precios y haz tu pedido por WhatsApp con delivery o retiro.`;

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

  return (
    <>
      {/* Datos estructurados Restaurant */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(businessJsonLd) }} />
      <style>{tenantThemeCss}</style>
      <div className="tenant-theme-vars">
        <TenantShell>{children}</TenantShell>
      </div>
    </>
  );
}
