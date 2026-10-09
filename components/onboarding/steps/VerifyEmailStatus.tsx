"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { useLocale } from "next-intl";

import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import { getOnboardingUiCopy } from "@/lib/onboarding/onboarding-ui-copy";
import { OnboardingStepBar } from "./OnboardingStepBar";

type VerifyError = "missing" | "invalid" | "server" | "connection";

type VerifyState =
	| { status: "loading" }
	| { status: "ok"; next: string; panelOnly: boolean }
	| { status: "error"; reason: VerifyError };

type VerifyResponse = { ok?: boolean; token?: string | null; panelOnly?: boolean };

/**
 * Confirma el correo con el token del enlace y lleva al paso siguiente: «Crear mi tienda»
 * o, con un plan «solo panel CEO», elegir el plan. La página del plan también sabe decir
 * «ya pagaste» o «estamos revisando tu comprobante» si el enlace se abre más tarde.
 */
export function VerifyEmailStatus({ token }: { token: string | null }) {
	const locale = useLocale();
	const [state, setState] = useState<VerifyState>(() => (token ? { status: "loading" } : { status: "error", reason: "missing" }));
	// Reintentar tras una falla del servidor vuelve a pedir la verificación.
	const [attempt, setAttempt] = useState(0);
	const panelOnly = state.status === "ok" && state.panelOnly;
	const t = getOnboardingUiCopy(locale, { panelOnly }).verify;

	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		fetch(`/api/onboarding/verify?token=${encodeURIComponent(token)}`)
			.then(async (res) => {
				const data = (await res.json().catch(() => ({}))) as VerifyResponse;
				if (cancelled) return;
				if (!res.ok || !data.ok) {
					// El servicio responde en español fijo: aquí se dice en el idioma del visitante.
					// 400 y 404 son el enlace; lo demás (500, límite de intentos) se puede reintentar.
					setState({ status: "error", reason: res.status === 400 || res.status === 404 ? "invalid" : "server" });
					return;
				}
				const panelOnlyPlan = data.panelOnly === true;
				const encoded = encodeURIComponent(data.token || token);
				// El botón dice «Elegir mi plan»: va directo a esa página, sin pasar por la de la tienda.
				const next = panelOnlyPlan ? `/onboarding/complete?token=${encoded}` : `/onboarding/tienda?token=${encoded}`;
				setState({ status: "ok", next, panelOnly: panelOnlyPlan });
				window.setTimeout(() => window.location.assign(next), 1500);
			})
			.catch(() => {
				if (!cancelled) setState({ status: "error", reason: "connection" });
			});
		return () => {
			cancelled = true;
		};
	}, [token, attempt]);

	const retryable = state.status === "error" && (state.reason === "server" || state.reason === "connection");
	const errorText =
		state.status !== "error"
			? ""
			: state.reason === "missing"
				? t.missingToken
				: state.reason === "invalid"
					? t.genericError
					: state.reason === "server"
						? t.serverError
						: t.connectionError;

	// Con «solo panel CEO», confirmar el correo es el paso 2: lo que sigue es el plan (3).
	const current = state.status === "ok" ? (state.panelOnly ? 3 : 2) : 1;

	return (
		<main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8 sm:py-16">
			<OnboardingStepBar current={current} panelOnly={panelOnly} compact />
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
						<p className="mt-2 text-[15px] leading-relaxed text-slate-600">{errorText}</p>
						{retryable ? (
							<button
								type="button"
								onClick={() => {
									setState({ status: "loading" });
									setAttempt((value) => value + 1);
								}}
								className="onboarding-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm"
							>
								{t.retry}
							</button>
						) : (
							<Link href="/onboarding" className="onboarding-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm">
								{t.startOver}
							</Link>
						)}
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
