import Link from "next/link";
import { Lock } from "lucide-react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { OnboardingRecaptchaProvider } from "@/components/onboarding/recaptcha-provider";
import { LandingLogo } from "@/components/ui/logo/landing-logo";
import { getCurrentLocale } from "@/lib/i18n/server";
import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import { getOnboardingUiCopy } from "@/lib/onboarding/onboarding-ui-copy";
import "../super-admin.tailwind.css";
import "./onboarding.css";

export const viewport = {
	width: "device-width",
	initialScale: 1,
};

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
	const t = getOnboardingUiCopy(await getCurrentLocale());

	return (
		<div className="onboarding-page flex min-h-screen flex-col">
			<header className="onboarding-header sticky top-0 z-20 px-5 sm:px-8">
				<div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
					<Link href="/" className="shrink-0 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F5BFF]/40">
						<LandingLogo forceLightText />
					</Link>
					<div className="flex items-center gap-3 sm:gap-5">
						<LanguageSwitcher />
						<p className="hidden text-sm text-slate-500 md:block">
							{t.header.haveAccount}{" "}
							<Link href="/login" className="onboarding-link font-semibold">
								{t.header.signIn}
							</Link>
						</p>
						<Link href="/login" className="onboarding-link text-sm font-semibold md:hidden">
							{t.header.signIn}
						</Link>
					</div>
				</div>
			</header>

			<OnboardingRecaptchaProvider>
				<div className="flex-1">{children}</div>
			</OnboardingRecaptchaProvider>

			<footer className="border-t border-slate-200/80 px-5 py-6 sm:px-8">
				<div className="mx-auto flex max-w-6xl flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
					<p className="flex items-center gap-2">
						<Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
						{t.footer.secure}
					</p>
					<nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label={t.footer.help}>
						<Link href="/onboarding/terminos" className="onboarding-link">
							{t.footer.terms}
						</Link>
						<Link href="/onboarding/privacidad" className="onboarding-link">
							{t.footer.privacy}
						</Link>
						<a href={`mailto:${LANDING_SUPPORT_EMAIL}`} className="onboarding-link">
							{t.footer.help}
						</a>
					</nav>
				</div>
			</footer>
		</div>
	);
}
