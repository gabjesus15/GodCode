import type { Metadata } from "next";
import type { ReactNode } from "react";

import { tenantBrandingIconVersionSeed } from "@/lib/tenant/tenant-favicon-utils";
import { getCachedCompany } from "../../utils/tenant-cache";
import "./tenant.css";
import { TenantShell } from "../../components/tenant/shell/tenant-shell";

export const dynamic = "force-dynamic";

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

interface TenantLayoutProps {
  children: ReactNode;
  params: Promise<{ subdomain: string }>;
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
  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);

  if (!company) {
    return { title: { absolute: "GodCode" } };
  }

  const status = company.subscription_status?.toLowerCase();
  if (status === "suspended" || status === "cancelled") {
    return { title: { absolute: "GodCode" } };
  }

  const name = company.theme_config?.displayName ?? company.name ?? "GodCode";
  const versionSeed = tenantBrandingIconVersionSeed(company);
  const icon = `/${resolvedParams.subdomain}/icon?v=${encodeURIComponent(versionSeed)}`;

  // Mejorar título y descripción según idioma y empresa
  const DESCRIPTIONS: Record<string, string> = {
    es: `Panel de administración de ${name}. Gestiona tu empresa, planes y pedidos.`,
    en: `${name} admin panel. Manage your company, plans and orders.`,
    pt: `Painel de administração de ${name}. Gerencie sua empresa, planos e pedidos.`,
    fr: `Panneau d'administration de ${name}. Gérez votre entreprise, plans et commandes.`,
    de: `${name} Admin-Panel. Verwalten Sie Ihr Unternehmen, Pläne und Bestellungen.`,
    it: `Pannello di amministrazione di ${name}. Gestisci la tua azienda, piani e ordini.`,
  };
  // Detectar idioma por preferencia o default (usando fallback a 'es')
  // company.locale no existe, así que usamos 'es' siempre o podrías usar otro campo si lo tienes
  const lang = 'es';
  return {
    title: {
      absolute: name,
    },
    description: DESCRIPTIONS[lang] || DESCRIPTIONS['es'],
    icons: {
      icon,
      shortcut: icon,
      apple: icon,
    },
  };
}

export default async function TenantLayout({
  children,
  params,
}: TenantLayoutProps) {
  const resolvedParams = await params;
  const company = await getCachedCompany(resolvedParams.subdomain);
  const primaryColor = company?.theme_config?.primaryColor ?? "#111827";
  const secondaryColor = company?.theme_config?.secondaryColor ?? primaryColor;
  const priceColor = company?.theme_config?.priceColor ?? "#ff4757";
  const discountColor = company?.theme_config?.discountColor ?? "#25d366";
  const hoverColor = company?.theme_config?.hoverColor ?? "#ff2e40";
  const accentShadow = toRgba(primaryColor, 0.3, "rgba(255, 71, 87, 0.3)");
  const accentShadowStrong = toRgba(
    primaryColor,
    0.5,
    "rgba(255, 71, 87, 0.5)"
  );
  const cardBorder = toRgba(primaryColor, 0.18, "rgba(255, 255, 255, 0.1)");
  const backgroundColor =
    company?.theme_config?.backgroundColor ?? "#0a0a0a";
  const backgroundImageUrl =
    company?.theme_config?.backgroundImageUrl ?? "/tenant/menu-pattern.webp";
  const backgroundImage = backgroundImageUrl
    ? `url(${backgroundImageUrl}), url(/tenant/menu-pattern.webp)`
    : "url(/tenant/menu-pattern.webp)";
  const tenantThemeCss = `.tenant-theme-vars{--tenant-primary:${sanitizeCssValue(primaryColor)};--accent-primary:${sanitizeCssValue(primaryColor)};--accent-secondary:${sanitizeCssValue(secondaryColor)};--price-color:${sanitizeCssValue(priceColor)};--discount-color:${sanitizeCssValue(discountColor)};--accent-hover:${sanitizeCssValue(hoverColor)};--accent-shadow:${sanitizeCssValue(accentShadow)};--accent-shadow-strong:${sanitizeCssValue(accentShadowStrong)};--card-border:${sanitizeCssValue(cardBorder)};--bg-primary:${sanitizeCssValue(backgroundColor)};--tenant-bg-image:${sanitizeCssValue(backgroundImage)};}`;

  // Construir URL base para el subdominio
  const baseUrl = `https://${resolvedParams.subdomain}.godcode.me`;

  // SEO y social meta tags
  const seoTitle = company?.theme_config?.displayName ?? company?.name ?? "GodCode";
  const seoDescription = `Panel de administración de ${seoTitle}. Gestiona tu empresa, planes y pedidos.`;
  const iconVersionSeed = company
    ? tenantBrandingIconVersionSeed(company)
    : resolvedParams.subdomain;
  const ogImage = `https://${resolvedParams.subdomain}.godcode.me/${resolvedParams.subdomain}/tenant-favicon?v=${encodeURIComponent(iconVersionSeed)}`;
  const iconHref = `/${resolvedParams.subdomain}/icon?v=${encodeURIComponent(iconVersionSeed)}`;

  // Datos estructurados schema.org
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": seoTitle,
    "url": baseUrl,
    "logo": ogImage,
    "description": seoDescription
  };

  return (
    <>
      <link rel="preconnect" href="https://res.cloudinary.com" />
      <link rel="dns-prefetch" href="https://res.cloudinary.com" />
      <link rel="icon" href={iconHref} />
      <link rel="shortcut icon" href={iconHref} />
      {/* SEO meta tags */}
      <meta name="robots" content="index,follow" />
      <meta name="description" content={seoDescription} />
      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:url" content={baseUrl} />
      <meta property="og:image" content={ogImage} />
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={ogImage} />
      {/* Etiqueta canónica y hreflang para SEO internacional en subdominios */}
      <link rel="canonical" href={baseUrl} />
      {['es','en','pt','fr','de','it'].map((lang) => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${baseUrl}?hl=${lang}`}
        />
      ))}
      {/* Datos estructurados Organization */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
      <style>{tenantThemeCss}</style>
      <div className="tenant-theme-vars">
        <TenantShell>{children}</TenantShell>
      </div>
    </>
  );
}
