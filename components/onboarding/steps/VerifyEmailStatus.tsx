"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { useLocale } from "next-intl";

import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import { getOnboardingUiCopy } from "@/lib/onboarding/onboarding-ui-copy";
import { OnboardingStepBar } from "./OnboardingStepBar";

type VerifyState = { status: "loading" } | { status: "ok"; next: string } | { status: "error"; message: string };

/** Confirma el correo con el token del enlace y lleva al paso 2 (elegir plan). */
export function VerifyEmailStatus({ token }: { token: string | null }) {
	const t = getOnboardingUiCopy(useLocale()).verify;
	const [state, setState] = useState<VerifyState>(() => (token ? { status: "loading" } : { status: "error", message: t.missingToken }));

	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		fetch(`/api/onboarding/verify?token=${encodeURIComponent(token)}`)
			.then((res) => res.json())
			.then((data: { ok?: boolean; token?: string | null; error?: string }) => {
				if (cancelled) return;
				if (!data.ok) {
					setState({ status: "error", message: data.error || t.genericError });
					return;
				}
				const next = `/onboarding/complete?token=${encodeURIComponent(data.token || token)}`;
				setState({ status: "ok", next });
				window.setTimeout(() => window.location.assign(next), 1500);
			})
			.catch(() => {
				if (!cancelled) setState({ status: "error", message: t.connectionError });
			});
		return () => {
			cancelled = true;
		};
	}, [token, t.genericError, t.connectionError]);

	return (
		<main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8 sm:py-16">
			<OnboardingStepBar current={state.status === "ok" ? 2 : 1} compact />
			<div className="rounded-2xl border border-slate-200 p-6 sm:p-8" role="status" aria-live="polite">
				{state.status === "loading" ? (
					<div className="flex items-center gap-3">
						<span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" aria-hidden />
						<p className="text-[15px] text-slate-600">{t.checking}</p>
					</div>
				) : null}

				{state.status === "ok" ? (
					<>
						<span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
							<Check className="h-5 w-5" aria-hidden />
						</span>
						<h1 className="mt-5 text-xl font-semibold text-slate-900">{t.okTitle}</h1>
						<p className="mt-2 text-[15px] leading-relaxed text-slate-600">{t.okBody}</p>
						<Link href={state.next} className="onboarding-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm">
							{t.continue}
						</Link>
					</>
				) : null}

				{state.status === "error" ? (
					<>
						<span className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
							<X className="h-5 w-5" aria-hidden />
						</span>
						<h1 className="mt-5 text-xl font-semibold text-slate-900">{t.errorTitle}</h1>
						<p className="mt-2 text-[15px] leading-relaxed text-slate-600">{state.message}</p>
						<Link href="/onboarding" className="onboarding-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm">
							{t.startOver}
						</Link>
						<p className="mt-5 text-sm text-slate-500">{t.help}</p>
						<a href={`mailto:${LANDING_SUPPORT_EMAIL}`} className="onboarding-link-brand mt-0.5 block text-sm">
							{LANDING_SUPPORT_EMAIL}
						</a>
					</>
				) : null}
			</div>
		</main>
	);
}
