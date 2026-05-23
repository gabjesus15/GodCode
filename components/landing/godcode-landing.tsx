import Image from "next/image";
import Link from "next/link";

import type { LandingMediaBundle } from "@/lib/landing/landing-media-types";
import type { PublicPlanForLanding } from "@/lib/plans/public-plans";
import type { CountryCode } from "@/lib/geo/landing-geo-plans";
import { getCurrentLocale, getCurrentMessages } from "@/lib/i18n/server";

import { LandingNav } from "./media/landing-nav";
import { LandingSections } from "./sections/landing-sections";
import { LandingScrollToTop } from "./widgets/landing-scroll-to-top";
import { FloatingWhatsappButton } from "./widgets/floating-whatsapp-button";
import { LandingThemeEnforcer } from "../theme/landing-theme-enforcer";

type GodcodeLandingProps = {
  plans: PublicPlanForLanding[];
  media: LandingMediaBundle;
  country?: CountryCode;
};

export async function GodcodeLanding({ plans, media, country = "OTHER" }: GodcodeLandingProps) {
  const locale = await getCurrentLocale();
  const messages = await getCurrentMessages();
  const t = messages.landing;
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "hola@godcode.me";
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-slate-800 dark:bg-zinc-950 dark:text-zinc-100">
      <LandingThemeEnforcer />
      <LandingNav />
      <LandingSections plans={plans} media={media} country={country} locale={locale} />

      <footer className="relative z-10 bg-black px-5 py-12 text-slate-400 sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Top: logo + columns */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-x-8 lg:gap-y-12">
            {/* Brand */}
            <div className="min-w-0 sm:col-span-2 sm:border-b sm:border-slate-800/60 sm:pb-10 lg:col-span-1 lg:border-b-0 lg:pb-0">
              <a href="#inicio" className="inline-flex items-center gap-1.5" aria-label="GodCode">
                <Image src="/logo.png" alt="" width={28} height={28} className="shrink-0" />
                <span className="text-lg font-bold tracking-tight text-white">
                  God<span className="text-indigo-400">Code</span>
                </span>
              </a>
              <p className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-slate-500 sm:max-w-xl lg:max-w-xs">
                {t.footer.brandDescription}
              </p>
              <a
                href={`mailto:${support}`}
                className="mt-4 inline-flex text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
              >
                {support}
              </a>
            </div>

            {/* Producto */}
            <div className="min-w-0 border-t border-slate-800/70 pt-8 sm:border-t-0 sm:pt-0 lg:border-t-0 lg:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t.footer.sections.product}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link href="/onboarding" className="transition-colors hover:text-white">{t.footer.links.createStore}</Link></li>
                <li><Link href="/sobre-godcode" prefetch={false} className="transition-colors hover:text-white">Sobre GodCode</Link></li>
                <li><a href="#funciones" className="transition-colors hover:text-white">{t.footer.links.features}</a></li>
                <li><a href="#demo" className="transition-colors hover:text-white">{t.footer.links.demo}</a></li>
                <li><a href="#precios" className="transition-colors hover:text-white">{t.footer.links.pricing}</a></li>
                <li><a href="#como-funciona" className="transition-colors hover:text-white">{t.footer.links.howItWorks}</a></li>
                <li><a href="#comparar" className="transition-colors hover:text-white">{t.footer.links.compare}</a></li>
                <li><a href="#testimonios" className="transition-colors hover:text-white">{t.footer.links.testimonials}</a></li>
              </ul>
            </div>

            {/* Soporte */}
            <div className="min-w-0 border-t border-slate-800/70 pt-8 sm:border-t-0 sm:pt-0 lg:border-t-0 lg:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t.footer.sections.support}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="#faq" className="transition-colors hover:text-white">{t.footer.links.faq}</a></li>
                <li><a href="#contacto" className="transition-colors hover:text-white">{t.footer.links.contact}</a></li>
                <li><Link href="/login" className="transition-colors hover:text-white">{t.footer.links.login}</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="min-w-0 border-t border-slate-800/70 pt-8 sm:col-span-2 sm:pt-8 lg:col-span-1 lg:border-t-0 lg:pt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t.footer.sections.legal}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><Link href="/onboarding/terminos" className="transition-colors hover:text-white">{t.footer.links.terms}</Link></li>
                <li><Link href="/onboarding/privacidad" className="transition-colors hover:text-white">{t.footer.links.privacy}</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center gap-3 border-t border-slate-800/80 pt-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-slate-600">
              © {new Date().getFullYear()} GodCode · godcode.me
            </p>
            <a
              href="#inicio"
              className="text-xs text-slate-600 transition-colors hover:text-slate-400"
            >
              {t.footer.links.backToTop} ↑
            </a>
          </div>
        </div>
      </footer>

      <LandingScrollToTop />
      <FloatingWhatsappButton phoneNumber="56943848080" />
    </div>
  );
}
