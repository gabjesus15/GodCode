import type { Metadata } from "next";

import { ArrowRight, ChartNoAxesCombined, ShieldCheck, Sparkles, Users } from "lucide-react";

import { LandingLogo } from "@/components/landing/media/landing-logo";
import { normalizeLocale } from "@/lib/i18n/config";
import { getAppUrl } from "@/lib/tenant/app-url";
import { getCurrentLocale } from "@/lib/i18n/server";

type AboutSearchParams = {
  hl?: string;
};

const copy = {
  es: {
    eyebrow: "Sobre GodCode",
    title: "Una plataforma pensada para vender online sin perder el control de tu negocio.",
    intro:
      "GodCode simplifica lo que hoy suele estar fragmentado: menú digital, pedidos online, caja, inventario y delivery, todo en un solo lugar.",
    primaryCta: "Crear mi tienda",
    secondaryCta: "Ver la home",
    facts: [
      { label: "Sin comisión", detail: "Cada venta es tuya al 100%." },
      { label: "Tu dominio", detail: "Tu marca vive en tu propia URL." },
      { label: "Multisucursal", detail: "Escala a todas tus ubicaciones." },
      { label: "En minutos", detail: "Sin necesidad de programar." },
    ],
      sectionOneEyebrow: "01 · Qué resuelve",
    sectionOneTitle: "Vende por tu propia web, sin ceder margen.",
    sectionOneText:
      "Restaurantes y negocios con sucursales pierden margen en cada pedido que pasa por un marketplace. GodCode les da su propia tienda, con su propio dominio y sin comisiones.",
    sectionOneFeatures: ["Menú digital con fotos", "Carrito y checkout propio", "Delivery y retiro en tienda", "Caja e inventario integrados"],
      sectionTwoEyebrow: "02 · Cómo trabajamos",
    sectionTwoTitle: "Menos pasos, más pedidos.",
    sectionTwoText:
      "Priorizamos una experiencia simple para el negocio y clara para el cliente: menos pantallas, menos fricción y una ruta directa desde el menú hasta el pago.",
    sectionTwoFeatures: ["Onboarding guiado en minutos", "Panel de control centralizado", "Notificaciones en tiempo real", "Soporte humano cuando lo necesitas"],
    pullQuote: "Cada pedido que llega por tu propia web es tuyo al 100%.",
      sectionThreeEyebrow: "03 · Por qué importa",
    sectionThreeTitle: "Construye autoridad en tu propio dominio.",
    sectionThreeText:
      "Cuando tu marca vive en tu propio dominio, también construyes posicionamiento en Google y una relación más directa con tus clientes, sin intermediarios que se queden con tu margen.",
    sectionThreeFeatures: ["Tu URL, tu SEO, tu tráfico", "Datos de tus clientes en tus manos", "Sin dependencia de plataformas externas", "Dominio personalizado incluido"],
    valuesTitle: "Principios de la plataforma",
    values: [
      { num: "01", icon: ShieldCheck, title: "Datos protegidos", text: "Cada negocio mantiene su información aislada y segura." },
      { num: "02", icon: Sparkles, title: "Experiencia limpia", text: "Interfaces directas, sin ruido visual ni pasos innecesarios." },
      { num: "03", icon: Users, title: "Para equipos reales", text: "Funciona para locales únicos y para operaciones con varias sucursales." },
      { num: "04", icon: ChartNoAxesCombined, title: "Crecimiento visible", text: "Una marca fuerte y un dominio propio ayudan a posicionarte mejor." },
    ],
    closingEyebrow: "Empieza hoy",
    closingTitle: "Tu tienda online, en tu propio dominio.",
    closingText: "Crea tu cuenta, configura tu menú y empieza a recibir pedidos. Sin comisiones, sin contratos.",
  },
  en: {
    eyebrow: "About GodCode",
    title: "A platform designed to sell online without losing control of your business.",
    intro:
      "GodCode simplifies what is usually fragmented: digital menu, online orders, POS, inventory and delivery, all in one place.",
    primaryCta: "Create my store",
    secondaryCta: "View home",
    facts: [
      { label: "Zero commission", detail: "Every sale is 100% yours." },
      { label: "Your own domain", detail: "Your brand lives on your own URL." },
      { label: "Multi-branch", detail: "Scale across all your locations." },
      { label: "Ready in minutes", detail: "No coding required." },
    ],
    sectionOneEyebrow: "01 · What it solves",
    sectionOneTitle: "Sell through your own website, without giving up margin.",
    sectionOneText:
      "Restaurants and multi-branch businesses lose margin on every order that goes through a marketplace. GodCode gives them their own store, their own domain and zero commissions.",
    sectionOneFeatures: ["Digital menu with photos", "Own cart and checkout", "Delivery and in-store pickup", "Integrated POS and inventory"],
    sectionTwoEyebrow: "02 · How we work",
    sectionTwoTitle: "Fewer steps, more orders.",
    sectionTwoText:
      "We prioritize a simple experience for the business and a clear one for the customer: fewer screens, less friction and a direct path from the menu to payment.",
    sectionTwoFeatures: ["Guided onboarding in minutes", "Centralized control panel", "Real-time notifications", "Human support when you need it"],
    pullQuote: "Every order that arrives through your own website is 100% yours.",
    sectionThreeEyebrow: "03 · Why it matters",
    sectionThreeTitle: "Build authority on your own domain.",
    sectionThreeText:
      "When your brand lives on your own domain, you also build Google rankings and a more direct relationship with your customers, without middlemen taking your margin.",
    sectionThreeFeatures: ["Your URL, your SEO, your traffic", "Your customer data in your hands", "No dependency on external platforms", "Custom domain included"],
    valuesTitle: "Platform principles",
    values: [
      { num: "01", icon: ShieldCheck, title: "Protected data", text: "Each business keeps its information isolated and secure." },
      { num: "02", icon: Sparkles, title: "Clean experience", text: "Straightforward interfaces without visual noise or extra steps." },
      { num: "03", icon: Users, title: "Built for real teams", text: "Works for single locations and multi-branch operations alike." },
      { num: "04", icon: ChartNoAxesCombined, title: "Visible growth", text: "A strong brand and your own domain help you rank better." },
    ],
    closingEyebrow: "Get started",
    closingTitle: "Your online store, on your own domain.",
    closingText: "Create your account, configure your menu and start receiving orders. No commissions, no contracts.",
  },
} as const;

function getLocaleCopy(locale: string) {
  return locale.toLowerCase().startsWith("es") ? copy.es : copy.en;
}

function resolveAboutLocale(hlParam: string | undefined, fallbackLocale: string): "es" | "en" {
  const normalized = hlParam ? normalizeLocale(hlParam) : normalizeLocale(fallbackLocale);
  return normalized === "es" ? "es" : "en";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<AboutSearchParams>;
}): Promise<Metadata> {
  const base = getAppUrl();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const fallbackLocale = await getCurrentLocale();
  const locale = resolveAboutLocale(resolvedSearchParams?.hl, fallbackLocale);
  const isSpanish = locale === "es";
  const title = isSpanish ? "Sobre GodCode" : "About GodCode";
  const description = isSpanish
    ? "Página de marca de GodCode: una plataforma para menú digital, pedidos online, caja, inventario y delivery."
    : "GodCode brand page: a platform for digital menus, online orders, POS, inventory and delivery.";
  const canonical =
    locale === "es"
      ? `${base}/sobre-godcode`
      : `${base}/sobre-godcode?hl=${locale}`;
  return {
    metadataBase: new URL(base),
    title,
    description,
    alternates: {
      canonical,
      languages: {
        es: `${base}/sobre-godcode`,
        en: `${base}/sobre-godcode?hl=en`,
        "x-default": `${base}/sobre-godcode`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "GodCode",
      type: "website",
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  };
}

export default async function SobreGodCodePage({
  searchParams,
}: {
  searchParams?: Promise<AboutSearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const fallbackLocale = await getCurrentLocale();
  const locale = resolveAboutLocale(resolvedSearchParams?.hl, fallbackLocale);
  const t = getLocaleCopy(locale);
  const base = getAppUrl();
  const ld = [
    { "@context": "https://schema.org", "@type": "AboutPage", name: "Sobre GodCode", url: `${base}/sobre-godcode`, description: t.intro },
    { "@context": "https://schema.org", "@type": "Organization", name: "GodCode", url: base },
  ];

  return (
    <main className="bg-white text-[#1d1d1f]">
      <script
        id="godcode-about-jsonld"
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: structured data JSON-LD must be inline for Googlebot
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <a
            href="/"
            aria-label="Ir al inicio de GodCode"
            title="Ir al inicio de GodCode"
            className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <LandingLogo className="gap-1" />
          </a>
          <a
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            {t.primaryCta}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-24 sm:pb-28 sm:pt-32 lg:pt-40">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
          {t.eyebrow}
        </p>
        <h1
          className="mt-5 max-w-4xl text-[clamp(2.6rem,5.5vw,5.25rem)] font-semibold leading-[1.06] tracking-[-0.03em] text-[#1d1d1f]"
        >
          {t.title}
        </h1>
        <p className="mt-7 max-w-2xl text-xl leading-relaxed text-[#6e6e73]">
          {t.intro}
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-6">
          <a
            href="/onboarding"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            {t.primaryCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </a>
          <a
            href="/"
            className="text-sm font-medium text-[#6e6e73] underline decoration-zinc-300 underline-offset-4 transition hover:text-[#1d1d1f] hover:decoration-zinc-600"
          >
            {t.secondaryCta} →
          </a>
        </div>
      </section>

      {/* ── FACTS ── */}
      <section className="border-y border-[#e5e5ea] bg-[#fbfbfd]">
        <div className="mx-auto max-w-5xl px-6">
          <dl className="grid divide-y divide-[#e5e5ea] sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {t.facts.map((fact) => (
              <div key={fact.label} className="py-10 sm:px-8 sm:first:pl-0 sm:last:pr-0">
                <dt className="border-t border-indigo-500 pt-4 text-lg font-semibold tracking-tight text-[#1d1d1f]">{fact.label}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[#6e6e73]">{fact.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── SECTION 01 ── */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                {t.sectionOneEyebrow}
              </p>
              <h2
                className="mt-4 text-[clamp(1.9rem,3.5vw,3rem)] font-semibold leading-[1.1] tracking-[-0.022em] text-[#1d1d1f]"
              >
                {t.sectionOneTitle}
              </h2>
            </div>
            <div className="flex flex-col justify-center gap-8">
              <p className="text-lg leading-relaxed text-[#6e6e73]">
                {t.sectionOneText}
              </p>
              <ul className="space-y-3">
                {t.sectionOneFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-[#1d1d1f]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 02 ── */}
      <section className="border-t border-[#e5e5ea] bg-[#fbfbfd]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                {t.sectionTwoEyebrow}
              </p>
              <h2
                className="mt-4 text-[clamp(1.9rem,3.5vw,3rem)] font-semibold leading-[1.1] tracking-[-0.022em] text-[#1d1d1f]"
              >
                {t.sectionTwoTitle}
              </h2>
            </div>
            <div className="flex flex-col justify-center gap-8">
              <p className="text-lg leading-relaxed text-[#6e6e73]">
                {t.sectionTwoText}
              </p>
              <ul className="space-y-3">
                {t.sectionTwoFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-[#1d1d1f]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── PULL QUOTE ── */}
      <section className="border-t border-[#e5e5ea] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28 lg:py-32">
          <blockquote
            className="text-[clamp(1.6rem,3.8vw,3.25rem)] font-semibold leading-[1.15] tracking-[-0.022em] text-[#1d1d1f]"
          >
            <span className="text-indigo-600">&ldquo;</span>
            {t.pullQuote}
            <span className="text-indigo-600">&rdquo;</span>
          </blockquote>
        </div>
      </section>

      {/* ── SECTION 03 ── */}
      <section className="border-t border-[#e5e5ea] bg-[#fbfbfd]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:py-40">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
                {t.sectionThreeEyebrow}
              </p>
              <h2
                className="mt-4 text-[clamp(1.9rem,3.5vw,3rem)] font-semibold leading-[1.1] tracking-[-0.022em] text-[#1d1d1f]"
              >
                {t.sectionThreeTitle}
              </h2>
            </div>
            <div className="flex flex-col justify-center gap-8">
              <p className="text-lg leading-relaxed text-[#6e6e73]">
                {t.sectionThreeText}
              </p>
              <ul className="space-y-3">
                {t.sectionThreeFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-3 text-sm text-[#1d1d1f]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRINCIPLES ── */}
      <section className="border-t border-[#e5e5ea] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
            {t.valuesTitle}
          </p>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-[#e5e5ea] lg:gap-0">
            {t.values.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className={i > 0 ? "lg:pl-10" : ""}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">{item.num}</p>
                  <Icon className="mt-4 h-5 w-5 text-zinc-400" aria-hidden />
                  <h3 className="mt-4 text-base font-semibold text-[#1d1d1f]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6e6e73]">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CLOSING ── */}
      <section className="border-t border-[#e5e5ea] bg-[#fbfbfd]">
        <div className="mx-auto max-w-5xl px-6 py-24 sm:py-32 lg:py-40">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
            {t.closingEyebrow}
          </p>
          <h2
            className="mt-5 max-w-3xl text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.1] tracking-[-0.022em] text-[#1d1d1f]"
          >
            {t.closingTitle}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#6e6e73]">
            {t.closingText}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <a
              href="/onboarding"
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
            >
              {t.primaryCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <a
              href="/"
              className="text-sm font-medium text-[#6e6e73] underline decoration-zinc-300 underline-offset-4 transition hover:text-[#1d1d1f] hover:decoration-zinc-600"
            >
              {t.secondaryCta} →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
