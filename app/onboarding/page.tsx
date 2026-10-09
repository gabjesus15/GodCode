import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingStep1Form } from "@/components/onboarding/steps/OnboardingStep1Form";
import { OnboardingStepBar } from "@/components/onboarding/steps/OnboardingStepBar";
import { getCurrentLocale } from "@/lib/i18n/server";
import { LANDING_COMPANY_NAME, LANDING_PRODUCT_NAME, LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import { resolveOnboardingCountry, sanitizePlanHint } from "@/lib/onboarding/onboarding-entry";
import { getOnboardingUiCopy } from "@/lib/onboarding/onboarding-ui-copy";
import { getAppUrl } from "@/lib/tenant/app-url";

export async function generateMetadata(): Promise<Metadata> {
	const base = getAppUrl();
	// «Arma y paga»: la tienda se arma gratis y se paga al publicarla. La plantilla del layout raíz
	// añade « · Gcode Labs» al título (63 caracteres en total); el producto va en la descripción.
	const title = "Crea tu tienda online gratis y pagas al publicarla";
	const description = `Arma gratis tu tienda con ${LANDING_PRODUCT_NAME}: menú digital, pedidos online, caja, inventario y delivery, sin comisiones por venta. Pagas cuando la publicas.`;
	return {
		title,
		description,
		alternates: {
			canonical: `${base}/onboarding`,
		},
		openGraph: {
			title: `${title} · ${LANDING_COMPANY_NAME}`,
			description,
			url: `${base}/onboarding`,
			siteName: LANDING_COMPANY_NAME,
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

export default async function OnboardingPage({
	searchParams,
}: {
	searchParams?: Promise<{ hl?: string; plan?: string; pais?: string; country?: string }>;
}) {
	const resolved = searchParams ? await searchParams : undefined;
	// Onboarding no usa ?hl=; consolidar señales SEO en la URL limpia.
	if (resolved?.hl) {
		redirect("/onboarding");
	}

	// El plan y el país que trae el landing llegan marcados al publicar la tienda. Sin país
	// en el link, se usa el del visitante.
	const planId = sanitizePlanHint(resolved?.plan);
	const country =
		resolveOnboardingCountry(resolved?.pais ?? resolved?.country) ?? resolveOnboardingCountry((await headers()).get("x-vercel-ip-country"));

	const t = getOnboardingUiCopy(await getCurrentLocale()).start;

	return (
		<main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-16">
			<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-20">
				<section className="min-w-0 max-w-xl">
					<OnboardingStepBar current={1} />
					<h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{t.title}</h1>
					<p className="mt-3 max-w-lg text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">{t.subtitle}</p>
					<div className="mt-8 sm:mt-10">
						<OnboardingStep1Form planId={planId} country={country} />
					</div>
				</section>

				<aside className="min-w-0 lg:pt-1">
					<div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-7">
						<h2 className="text-sm font-semibold text-slate-900">{t.includesTitle}</h2>
						<ul className="mt-4 space-y-3">
							{t.includes.map((line) => (
								<li key={line} className="flex gap-3 text-sm leading-relaxed text-slate-700">
									<Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4F5BFF]" aria-hidden />
									{line}
								</li>
							))}
						</ul>

						<div className="my-6 h-px bg-slate-200" />

						<h2 className="text-sm font-semibold text-slate-900">{t.nextTitle}</h2>
						<ol className="mt-4 space-y-4">
							{t.next.map((step, index) => (
								<li key={step.title} className="flex gap-3">
									<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-semibold text-slate-700">
										{index + 1}
									</span>
									<span className="min-w-0">
										<span className="block text-sm font-medium text-slate-900">{step.title}</span>
										<span className="block text-sm leading-relaxed text-slate-500">{step.text}</span>
									</span>
								</li>
							))}
						</ol>

						<div className="my-6 h-px bg-slate-200" />

						<p className="text-sm leading-relaxed text-slate-600">{t.helpText}</p>
						<a href={`mailto:${LANDING_SUPPORT_EMAIL}`} className="onboarding-link-brand mt-1 block text-sm">
							{LANDING_SUPPORT_EMAIL}
						</a>
						<Link href="/onboarding/negocios" className="onboarding-link-brand mt-3 inline-flex items-center gap-1.5 text-sm">
							{t.businessesLink}
							<ArrowRight className="h-3.5 w-3.5" aria-hidden />
						</Link>
					</div>
				</aside>
			</div>
		</main>
	);
}
