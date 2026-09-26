"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { MailCheck, MailWarning } from "lucide-react";
import { useLocale } from "next-intl";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackEvent } from "@/lib/analytics/track-event";
import { fillCopy, getOnboardingUiCopy } from "@/lib/onboarding/onboarding-ui-copy";

type SentState = { email: string; emailSent: boolean };

const fieldClass = "h-12 rounded-xl px-4 text-[15px]";

export function OnboardingStep1Form() {
	const t = getOnboardingUiCopy(useLocale()).form;
	const { executeRecaptcha } = useGoogleReCaptcha();
	const ids = { business: useId(), name: useId(), email: useId(), consent: useId(), businessHint: useId(), emailHint: useId() };

	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sent, setSent] = useState<SentState | null>(null);
	const [resending, setResending] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);
	const [resendMessage, setResendMessage] = useState<string | null>(null);
	const [form, setForm] = useState({ business_name: "", responsible_name: "", email: "", accepted: false });

	useEffect(() => {
		if (resendCooldown <= 0) return undefined;
		const timer = setInterval(() => setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1)), 1000);
		return () => clearInterval(timer);
	}, [resendCooldown]);

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			const recaptchaToken = executeRecaptcha ? await executeRecaptcha("onboarding_apply") : "";
			const res = await fetch("/api/onboarding/apply", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					business_name: form.business_name,
					responsible_name: form.responsible_name,
					email: form.email,
					// Una sola casilla cubre términos y privacidad.
					terms_accepted: form.accepted,
					privacy_accepted: form.accepted,
					recaptcha_token: recaptchaToken,
				}),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string; skippedVerification?: boolean; token?: string; emailSent?: boolean };
			if (!res.ok) throw new Error(data.error ?? t.errorSubmit);
			trackEvent("sign_up", { method: "email" });
			// El servicio dio el correo por verificado (ONBOARDING_SKIP_EMAIL_VERIFICATION):
			// no hay enlace que esperar, se salta directo al paso 2.
			if (data.skippedVerification && data.token) {
				window.location.assign(`/onboarding/complete?token=${encodeURIComponent(String(data.token))}`);
				return;
			}
			setSent({ email: form.email.trim(), emailSent: data.emailSent !== false });
			// Si el correo no salió, se puede reenviar enseguida.
			setResendCooldown(data.emailSent === false ? 0 : 30);
		} catch (err) {
			setError(err instanceof Error && err.message ? err.message : t.errorUnexpected);
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (!sent || resendCooldown > 0 || resending) return;
		setResending(true);
		setResendMessage(null);
		try {
			const res = await fetch("/api/onboarding/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: sent.email }),
			});
			const data = (await res.json().catch(() => ({}))) as { error?: string; alreadyVerified?: boolean };
			if (!res.ok) throw new Error(data.error ?? t.resendError);
			setResendMessage(data.alreadyVerified ? t.resendAlready : t.resendSuccess);
			setSent((prev) => (prev ? { ...prev, emailSent: true } : prev));
			setResendCooldown(45);
		} catch (err) {
			setResendMessage(err instanceof Error && err.message ? err.message : t.resendError);
		} finally {
			setResending(false);
		}
	};

	if (sent) {
		const Icon = sent.emailSent ? MailCheck : MailWarning;
		const [before, after] = (sent.emailSent ? t.sentBody : t.notSentBody).split("{email}");
		return (
			<div role="status" className="rounded-2xl border border-slate-200 p-6 sm:p-8">
				<span
					className={
						sent.emailSent
							? "flex h-11 w-11 items-center justify-center rounded-full bg-[#EEF0FF] text-[#3640C9]"
							: "flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700"
					}
				>
					<Icon className="h-5 w-5" aria-hidden />
				</span>
				<h2 className="mt-5 text-xl font-semibold text-slate-900">{sent.emailSent ? t.sentTitle : t.notSentTitle}</h2>
				<p className="mt-2 text-[15px] leading-relaxed text-slate-600">
					{before}
					<strong className="font-semibold text-slate-900">{sent.email}</strong>
					{after}
				</p>
				{sent.emailSent ? (
					<ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-slate-500">
						{t.sentTips.map((tip) => (
							<li key={tip} className="flex gap-2">
								<span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
								{tip}
							</li>
						))}
					</ul>
				) : null}
				<div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
					<Button type="button" variant="outline" onClick={handleResend} disabled={resending || resendCooldown > 0} className="h-10 rounded-xl px-4">
						{resending ? t.resending : resendCooldown > 0 ? fillCopy(t.resendWait, { seconds: resendCooldown }) : t.resend}
					</Button>
					<p className="text-sm text-slate-500">
						{t.wrongEmail}{" "}
						<button
							type="button"
							className="onboarding-link font-medium"
							onClick={() => {
								setSent(null);
								setResendMessage(null);
								setResendCooldown(0);
							}}
						>
							{t.startOver}
						</button>
					</p>
				</div>
				{resendMessage ? <p className="mt-3 text-sm text-slate-600">{resendMessage}</p> : null}
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			<div className="space-y-2">
				<label htmlFor={ids.business} className="block text-sm font-medium text-slate-800">
					{t.businessName}
				</label>
				<Input
					id={ids.business}
					className={fieldClass}
					value={form.business_name}
					onChange={(event) => setForm((prev) => ({ ...prev, business_name: event.target.value }))}
					placeholder={t.businessPlaceholder}
					aria-describedby={ids.businessHint}
					autoComplete="organization"
					required
					minLength={2}
					maxLength={120}
				/>
				<p id={ids.businessHint} className="text-xs text-slate-500">
					{t.businessHint}
				</p>
			</div>

			<div className="space-y-2">
				<label htmlFor={ids.name} className="block text-sm font-medium text-slate-800">
					{t.yourName}
				</label>
				<Input
					id={ids.name}
					className={fieldClass}
					value={form.responsible_name}
					onChange={(event) => setForm((prev) => ({ ...prev, responsible_name: event.target.value }))}
					placeholder={t.yourNamePlaceholder}
					autoComplete="name"
					required
					minLength={2}
					maxLength={120}
				/>
			</div>

			<div className="space-y-2">
				<label htmlFor={ids.email} className="block text-sm font-medium text-slate-800">
					{t.email}
				</label>
				<Input
					id={ids.email}
					type="email"
					className={fieldClass}
					value={form.email}
					onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
					placeholder={t.emailPlaceholder}
					aria-describedby={ids.emailHint}
					autoComplete="email"
					inputMode="email"
					required
				/>
				<p id={ids.emailHint} className="text-xs text-slate-500">
					{t.emailHint}
				</p>
			</div>

			<div className="space-y-2 pt-1">
				<label htmlFor={ids.consent} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-slate-700">
					<input
						id={ids.consent}
						type="checkbox"
						checked={form.accepted}
						onChange={(event) => setForm((prev) => ({ ...prev, accepted: event.target.checked }))}
						className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
						required
					/>
					<span>
						{t.consentPrefix}{" "}
						<Link href="/onboarding/terminos" target="_blank" className="onboarding-link-brand">
							{t.termsLink}
						</Link>{" "}
						{t.consentJoin}{" "}
						<Link href="/onboarding/privacidad" target="_blank" className="onboarding-link-brand">
							{t.privacyLink}
						</Link>
						.
					</span>
				</label>
				<p className="pl-7 text-xs leading-relaxed text-slate-500">{t.analyticsNotice}</p>
			</div>

			{error ? (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
					{error}
				</div>
			) : null}

			<Button type="submit" loading={loading} size="lg" className="onboarding-btn-primary h-12 w-full rounded-xl text-[15px]">
				{t.submit}
			</Button>
		</form>
	);
}
