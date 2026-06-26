import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { getCurrentMessages } from "@/lib/i18n/server";
import { LandingLogo } from "@/components/landing/media/landing-logo";
import { OnboardingRecaptchaProvider } from "@/components/onboarding/recaptcha-provider";
import "../super-admin.tailwind.css";
import "./onboarding.css";

export const viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getCurrentMessages();
  const t = messages.onboarding.layout;

  return (
    <div className="onboarding-page flex min-h-screen flex-col">
      <header className="onboarding-header sticky top-0 z-10 px-4 py-3 sm:px-6">
        <div className="mx-auto flex h-10 max-w-4xl items-center justify-between gap-3">
          <a
            href="/"
            className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <LandingLogo forceLightText />
          </a>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              href="/onboarding/negocios"
              className="onboarding-header-cta flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium sm:gap-2 sm:px-4 sm:text-sm"
            >
              <span className="hidden sm:inline">{t.viewBusinesses}</span>
              <span className="sm:hidden">{t.businesses}</span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <OnboardingRecaptchaProvider>
        <div className="flex-1">{children}</div>
      </OnboardingRecaptchaProvider>

      <footer className="border-t border-slate-100 px-5 py-4 text-center text-xs text-slate-400 sm:py-5 sm:text-sm">
        {t.securityFooter}
      </footer>
    </div>
  );
}
