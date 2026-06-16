import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GodcodeLanding } from "../components/landing/godcode-landing";
import { getAppUrl } from "@/lib/tenant/app-url";
import { SUPPORTED_LOCALES, normalizeLocale, type AppLocale } from "@/lib/i18n/config";
import { getMessagesForLocale } from "@/lib/i18n/messages";
import { getCurrentLocale } from "@/lib/i18n/server";
import { getLandingMediaBundle } from "@/lib/landing/landing-media";
import { getPublicPlansForLanding } from "@/lib/plans/public-plans";
import { getSubdomainFromHost, isMainDomain } from "@/lib/tenant/main-domain-host";
import { getCountryFromHeaders } from "@/lib/geo/landing-geo-plans";

type LandingSearchParams = {
  hl?: string;
};

function resolveLandingLocale(hlParam: string | undefined, fallbackLocale: AppLocale): AppLocale {
  if (!hlParam) return fallbackLocale;
  return normalizeLocale(hlParam);
}

function buildLandingLanguageAlternates(base: string): Record<string, string> {
  const entries = SUPPORTED_LOCALES.map((locale) => [
    locale,
    locale === "es" ? `${base}/` : `${base}/?hl=${locale}`,
  ] as const);
  return Object.fromEntries(entries);
}

function getLandingFaq(locale: string) {
  const isSpanish = locale.toLowerCase().startsWith("es");
  return [
    {
      question: isSpanish ? "¿No sé nada de tecnología, puedo usarlo?" : "I am not technical, can I use it?",
      answer: isSpanish
        ? "Sí. No necesitas programar ni saber de servidores. Te registras, subes tus productos y tu tienda está lista. Si tienes dudas, nuestro soporte te guía."
        : "Yes. You do not need coding or server knowledge. Sign up, upload your products and your store is ready.",
    },
    {
      question: isSpanish ? "¿Cuánto cuesta realmente?" : "How much does it really cost?",
      answer: isSpanish
        ? "Los precios están en la sección de planes arriba. No hay costos ocultos, comisiones por venta ni cargos sorpresa."
        : "Prices are in the plans section above. No hidden costs, sales commissions or surprise fees.",
    },
    {
      question: isSpanish ? "¿Puedo cancelar cuando quiera?" : "Can I cancel anytime?",
      answer: isSpanish
        ? "Sí. Sin penalidad, sin permanencia mínima. Si no te sirve, cancelas y listo."
        : "Yes. No penalty and no minimum commitment.",
    },
    {
      question: isSpanish ? "¿Mis datos están seguros?" : "Is my data secure?",
      answer: isSpanish
        ? "Usamos encriptación SSL, servidores protegidos y cada negocio tiene sus datos completamente aislados. Nadie más puede ver tu información."
        : "We use SSL encryption and protected servers, and each business has fully isolated data.",
    },
    {
      question: isSpanish ? "¿Cuánto tardo en tener mi tienda lista?" : "How long until my store is ready?",
      answer: isSpanish
        ? "Si ya tienes tus productos y fotos, menos de 1 hora. El proceso de registro toma 5 minutos."
        : "If you already have products and photos, under one hour. Sign-up takes five minutes.",
    },
  ];
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<LandingSearchParams>;
}): Promise<Metadata> {
  const hdrs = await headers();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const fallbackLocale = await getCurrentLocale();
  const locale = resolveLandingLocale(resolvedSearchParams?.hl, fallbackLocale);
  const messages = getMessagesForLocale(locale);
  const host = hdrs.get("host") || "";
  if (!isMainDomain(host)) {
    return {};
  }
  // Usar siempre la URL canónica fija (www.godcode.me) para evitar
  // inconsistencias cuando el host es distinto (ej. godcode.me sin www).
  const base = getAppUrl();
  const canonical = `${base}${locale === "es" ? "/" : `/?hl=${locale}`}`;
  const languageAlternates = buildLandingLanguageAlternates(base);
  const shareTitle = messages.landing.meta.title;
  const description = messages.landing.meta.description;

  return {
    metadataBase: new URL(base),
    applicationName: "GodCode",
    title: {
      absolute: shareTitle,
    },
    description,
    keywords: [
      "menú digital para restaurantes",
      "pedidos online para restaurantes",
      "delivery para restaurantes",
      "menú digital",
      "pedidos online",
      "sistema de pedidos",
      "delivery",
      "punto de venta",
      "inventario",
      "caja",
      "sucursales",
      "SaaS para restaurantes",
      "plataforma ecommerce",
      "GodCode",
    ],
    alternates: {
      canonical,
      languages: {
        ...languageAlternates,
        "x-default": `${base}/`,
      },
    },
    openGraph: {
      title: shareTitle,
      description,
      url: canonical,
      siteName: "GodCode",
      locale: locale === "es" ? "es_CL" : "en_US",
      type: "website",
      images: [
        {
          url: `${base}/api/system/og`,
          width: 1200,
          height: 630,
          alt: shareTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description,
      images: [`${base}/api/system/og`],
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}

function JsonLd({
  plans,
  locale,
}: {
  plans: { pricesByContinent?: Record<string, { price: number; currency: string }> }[];
  locale: string;
}) {
  const base = getAppUrl();
  const prices = plans
    .flatMap(p => Object.values(p.pricesByContinent || {}))
    .map(p => Number(p.price ?? 0))
    .filter((p) => p > 0);
  const minPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : undefined;

  const offers =
    minPrice !== undefined
      ? {
          "@type": "AggregateOffer",
          lowPrice: String(minPrice),
          highPrice: String(maxPrice),
          priceCurrency: "USD",
          offerCount: String(prices.length),
        }
      : {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Consulta planes disponibles",
        };

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "GodCode",
      url: base,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Plataforma SaaS para crear tu tienda online con menú digital, carrito, delivery, caja, comandas e inventario.",
      offers,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "GodCode",
      url: base,
      description: "GodCode - Crea tu tienda online en minutos",
      potentialAction: {
        "@type": "SearchAction",
        target: `${base}/?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "SiteNavigationElement",
      name: "Funciones del menú digital",
      url: `${base}/#funciones`,
    },
    {
      "@context": "https://schema.org",
      "@type": "SiteNavigationElement",
      name: "Cómo funciona",
      url: `${base}/#como-funciona`,
    },
    {
      "@context": "https://schema.org",
      "@type": "SiteNavigationElement",
      name: "Demo del producto",
      url: `${base}/#demo`,
    },
    {
      "@context": "https://schema.org",
      "@type": "SiteNavigationElement",
      name: "Planes y precios",
      url: `${base}/#precios`,
    },
    {
      "@context": "https://schema.org",
      "@type": "SiteNavigationElement",
      name: "Preguntas frecuentes",
      url: `${base}/#faq`,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "GodCode",
      url: base,
      contactPoint: {
        "@type": "ContactPoint",
        email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "hola@godcode.me",
        contactType: "customer support",
        availableLanguage: ["es", "en", "pt", "fr", "de", "it"],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: getLandingFaq(locale).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: "Del caos al control: demo de GodCode",
      description:
        "Demo completo de GodCode: menú digital, carrito de pedidos, caja e inventario en una sola plataforma. Sin marketplaces, sin comisiones.",
      thumbnailUrl: `${base}/api/system/og`,
      uploadDate: "2025-01-01T00:00:00+00:00",
      contentUrl: `${base}/Del_caos_al_control.mp4`,
      embedUrl: `${base}/#demo`,
      inLanguage: "es",
    },
  ];
  return (
    <script
      id="godcode-jsonld-landing"
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<LandingSearchParams>;
}) {
  const hdrs = await headers();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const country = getCountryFromHeaders(hdrs);
  const host = hdrs.get("host") || "";
  if (isMainDomain(host)) {
    const fallbackLocale = await getCurrentLocale();
    const locale = resolveLandingLocale(resolvedSearchParams?.hl, fallbackLocale);
    const [plans, media] = await Promise.all([
      getPublicPlansForLanding(locale),
      getLandingMediaBundle(),
    ]);
    return (
      <>
        <JsonLd plans={plans} locale={locale} />
        <GodcodeLanding plans={plans} media={media} country={country} />
      </>
    );
  }
  const subdomain = getSubdomainFromHost(host);
  if (subdomain) {
    redirect(`/${subdomain}`);
  }
  redirect("/login");
}
