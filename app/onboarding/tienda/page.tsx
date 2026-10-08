import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Check, Eye, Store } from "lucide-react";

import { OnboardingStepBar } from "@/components/onboarding/steps/OnboardingStepBar";
import { StoreStartForm } from "@/components/onboarding/steps/StoreStartForm";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { getCurrentLocale } from "@/lib/i18n/server";
import { resolveBusinessSector } from "@/lib/onboarding/business-sectors";
import { getOnboardingUiCopy } from "@/lib/onboarding/onboarding-ui-copy";
import { getStoreStartCopy } from "@/lib/onboarding/store-start-copy";
import { suggestStoreSlug } from "@/lib/onboarding/store-draft-service";
import { getTenantHomeUrl } from "@/utils/tenant-url";

/** @service-role capability-token
 *
 * El verification_token del correo ya confirmado es la credencial: con él se ve el nombre
 * del negocio y el correo, y se crea la tienda en vista previa.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Crea tu tienda",
	robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

type AppRow = {
	id: string;
	email: string;
	status: string | null;
	payment_status: string | null;
	company_id: string | null;
	business_name: string | null;
	sector: string | null;
};

function readToken(raw: string | string[] | undefined): string | null {
	const value = Array.isArray(raw) ? raw[0] : raw;
	const token = String(value ?? "").trim();
	return token && token.length <= 100 ? token : null;
}

function Notice({ title, text, action }: { title: string; text: string; action: { label: string; href: string } }) {
	return (
		<main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8 sm:py-16">
			<OnboardingStepBar current={2} compact />
			<div className="rounded-2xl border border-slate-200 p-6 sm:p-8" role="status">
				<span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF0FF] text-[#3640C9]">
					<AlertCircle className="h-5 w-5" aria-hidden />
				</span>
				<h1 className="mt-5 text-xl font-semibold text-slate-900">{title}</h1>
				<p className="mt-2 text-[15px] leading-relaxed text-slate-600">{text}</p>
				<Link href={action.href} className="onboarding-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm">
					{action.label}
				</Link>
			</div>
		</main>
	);
}

export default async function OnboardingStorePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
	const token = readToken((await searchParams)?.token);
	if (!token) redirect("/onboarding?from=tienda&reason=no_token");

	const locale = await getCurrentLocale();
	const t = getStoreStartCopy(locale);
	const ui = getOnboardingUiCopy(locale);

	const { data } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,status,payment_status,company_id,business_name,sector")
		.eq("verification_token", token)
		.maybeSingle();
	const app = data as AppRow | null;

	if (!app) {
		return <Notice title={ui.verify.errorTitle} text={ui.verify.genericError} action={{ label: ui.verify.startOver, href: "/onboarding" }} />;
	}
	if (app.status === "pending_verification") redirect(`/onboarding/verify/${encodeURIComponent(token)}`);
	if (app.company_id || app.payment_status === "paid" || app.status === "active") {
		return <Notice title={t.createdTitle} text={t.createdBody} action={{ label: t.login, href: "/login" }} />;
	}
	// Quien empezó con el alta de antes (plan y pago primero) sigue por ahí.
	if (app.status === "form_completed" || app.status === "payment_pending") redirect(`/onboarding/pago?token=${encodeURIComponent(token)}`);

	const businessName = String(app.business_name ?? "").trim();
	const initialSlug = await suggestStoreSlug(supabaseAdmin, businessName);
	// `godcode.me/`: lo que va antes del link de la tienda.
	const linkPrefix = getTenantHomeUrl("__slug__").replace(/^https?:\/\//, "").replace("__slug__", "");

	return (
		<main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-16">
			<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] lg:gap-20">
				<section className="min-w-0 max-w-xl">
					<OnboardingStepBar current={2} />
					<h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{t.title}</h1>
					<p className="mt-3 max-w-lg text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">{t.subtitle}</p>
					<div className="mt-8 sm:mt-10">
						<StoreStartForm
							token={token}
							email={app.email}
							initialName={businessName}
							initialSlug={initialSlug}
							initialSector={app.sector ? resolveBusinessSector(app.sector) : null}
							linkPrefix={linkPrefix}
							copy={t}
						/>
					</div>
				</section>

				<aside className="min-w-0 lg:pt-1">
					<div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80">
						<div className="flex items-start gap-3.5 border-b border-slate-200 bg-white p-6 sm:p-7">
							<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EEF0FF] text-[#3640C9]">
								<Eye className="h-[18px] w-[18px]" aria-hidden />
							</span>
							<span className="min-w-0">
								<span className="block text-sm font-semibold text-slate-900">{t.asideLinkTitle}</span>
								<span className="mt-0.5 block text-sm leading-relaxed text-slate-500">{t.asidePreviewNote}</span>
							</span>
						</div>
						<div className="p-6 sm:p-7">
							<h2 className="text-sm font-semibold text-slate-900">{t.freeTitle}</h2>
							<ul className="mt-4 space-y-3">
								{t.free.map((line) => (
									<li key={line} className="flex gap-3 text-sm leading-relaxed text-slate-700">
										<Check className="mt-0.5 h-4 w-4 shrink-0 text-[#4F5BFF]" aria-hidden />
										{line}
									</li>
								))}
							</ul>
							<div className="my-6 h-px bg-slate-200" />
							<h2 className="text-sm font-semibold text-slate-900">{t.paidTitle}</h2>
							<ul className="mt-4 space-y-3">
								{t.paid.map((line) => (
									<li key={line} className="flex gap-3 text-sm leading-relaxed text-slate-600">
										<Store className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
										{line}
									</li>
								))}
							</ul>
						</div>
					</div>
				</aside>
			</div>
		</main>
	);
}
