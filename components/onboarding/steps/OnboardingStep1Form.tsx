"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COPY = {
	es: {
		errorSubmit: "Error al enviar la solicitud",
		errorUnexpected: "Error inesperado",
		resend: "Reenviar correo",
		resending: "Reenviando...",
		resendWait: "Espera {seconds}s para reenviar",
		resendSuccess: "Correo reenviado. Revisa tu bandeja.",
		resendAlready: "Tu correo ya fue verificado. Puedes continuar.",
		resendError: "No pudimos reenviar el correo",
		successTitle: "Solicitud enviada",
		successPrefix: "Enviamos un correo de verificación a",
		successSuffix: "Revisa tu bandeja y haz clic en el enlace para continuar.",
		successSpam: "Si no ves el correo, revisa la carpeta de spam.",
		businessName: "Nombre del negocio",
		businessPlaceholder: "Ej: Mi Restaurante",
		yourName: "Tu nombre",
		yourNamePlaceholder: "Ej: Juan Pérez",
		email: "Email",
		acceptTermsPrefix: "Acepto los",
		acceptTermsLink: "términos de servicio",
		acceptPrivacyPrefix: "Acepto la",
		acceptPrivacyLink: "política de privacidad",
		continue: "Continuar",
	},
	en: {
		errorSubmit: "Could not submit the request",
		errorUnexpected: "Unexpected error",
		resend: "Resend email",
		resending: "Resending...",
		resendWait: "Wait {seconds}s to resend",
		resendSuccess: "Email resent. Check your inbox.",
		resendAlready: "Your email is already verified. You can continue.",
		resendError: "Could not resend email",
		successTitle: "Request sent",
		successPrefix: "We sent a verification email to",
		successSuffix: "Check your inbox and click the link to continue.",
		successSpam: "If you do not see the email, check your spam folder.",
		businessName: "Business name",
		businessPlaceholder: "Ex: My Restaurant",
		yourName: "Your name",
		yourNamePlaceholder: "Ex: John Doe",
		email: "Email",
		acceptTermsPrefix: "I accept the",
		acceptTermsLink: "terms of service",
		acceptPrivacyPrefix: "I accept the",
		acceptPrivacyLink: "privacy policy",
		continue: "Continue",
	},
} as const;

export function OnboardingStep1Form() {
	const locale = useLocale();
	const t = COPY[locale.toLowerCase().startsWith("es") ? "es" : "en"];

	const [loading, setLoading] = useState(false);
	const [resending, setResending] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(0);
	const [resendMessage, setResendMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);
	const [form, setForm] = useState({
		business_name: "",
		responsible_name: "",
		email: "",
		terms_accepted: false,
		privacy_accepted: false,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/api/onboarding/apply", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					business_name: form.business_name,
					responsible_name: form.responsible_name,
					email: form.email,
					terms_accepted: form.terms_accepted,
					privacy_accepted: form.privacy_accepted,
				}),
			});

			const data = await res.json().catch(() => ({}));

			if (!res.ok) {
				throw new Error(data.error ?? t.errorSubmit);
			}
			setSuccess(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : t.errorUnexpected);
		} finally {
			setLoading(false);
		}
	};

	const handleResend = async () => {
		if (!form.email || resendCooldown > 0 || resending) return;
		setResending(true);
		setResendMessage(null);
		try {
			const res = await fetch("/api/onboarding/resend-verification", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: form.email }),
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(data.error ?? t.resendError);
			}
			setResendMessage(data.alreadyVerified ? t.resendAlready : t.resendSuccess);
			setResendCooldown(45);
		} catch (err) {
			setResendMessage(err instanceof Error ? err.message : t.resendError);
		} finally {
			setResending(false);
		}
	};

	useEffect(() => {
		if (resendCooldown <= 0) return undefined;
		const timer = setInterval(() => {
			setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
		}, 1000);
		return () => clearInterval(timer);
	}, [resendCooldown]);

	if (success) {
		return (
			<div className="onboarding-success-card w-full max-w-lg p-6 text-center sm:p-8">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white">
					<Check className="h-6 w-6" />
				</div>
				<h2 className="text-lg font-bold text-slate-900 sm:text-xl">{t.successTitle}</h2>
				<p className="mt-3 text-sm text-slate-600">
					{t.successPrefix} <strong className="font-semibold text-slate-800">{form.email}</strong>. {t.successSuffix}
				</p>
				<p className="mt-3 text-xs text-slate-400">
					{t.successSpam}
				</p>
				<div className="mt-5 space-y-2">
					<Button
						type="button"
						variant="outline"
						onClick={handleResend}
						disabled={resending || resendCooldown > 0}
						className="w-full"
					>
						{resending
							? t.resending
							: resendCooldown > 0
								? t.resendWait.replace("{seconds}", String(resendCooldown))
								: t.resend}
					</Button>
					{resendMessage ? (
						<p className="text-xs text-slate-500">{resendMessage}</p>
					) : null}
				</div>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
			<div className="onboarding-card space-y-5 p-5 sm:p-7">
				<label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
					<span>{t.businessName} <span className="text-red-500" aria-hidden>*</span></span>
					<Input
						className="onboarding-input"
						value={form.business_name}
						onChange={(e) => setForm((p) => ({ ...p, business_name: e.target.value }))}
						placeholder={t.businessPlaceholder}
						required
						minLength={2}
					/>
				</label>

				<label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
					<span>{t.yourName} <span className="text-red-500" aria-hidden>*</span></span>
					<Input
						className="onboarding-input"
						value={form.responsible_name}
						onChange={(e) => setForm((p) => ({ ...p, responsible_name: e.target.value }))}
						placeholder={t.yourNamePlaceholder}
						required
						minLength={2}
					/>
				</label>

				<label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
					<span>{t.email} <span className="text-red-500" aria-hidden>*</span></span>
					<Input
						className="onboarding-input"
						type="email"
						value={form.email}
						onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
						placeholder="contacto@empresa.com"
						required
					/>
				</label>

				<div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
					<label className="flex cursor-pointer items-start gap-3">
						<input
							type="checkbox"
							checked={form.terms_accepted}
							onChange={(e) => setForm((p) => ({ ...p, terms_accepted: e.target.checked }))}
							className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
							required
						/>
						<span className="text-sm text-slate-600">
							{t.acceptTermsPrefix} <Link href="/onboarding/terminos" className="font-medium text-indigo-600 hover:underline">{t.acceptTermsLink}</Link> <span className="text-red-500">*</span>
						</span>
					</label>
					<label className="flex cursor-pointer items-start gap-3">
						<input
							type="checkbox"
							checked={form.privacy_accepted}
							onChange={(e) => setForm((p) => ({ ...p, privacy_accepted: e.target.checked }))}
							className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
							required
						/>
						<span className="text-sm text-slate-600">
							{t.acceptPrivacyPrefix} <Link href="/onboarding/privacidad" className="font-medium text-indigo-600 hover:underline">{t.acceptPrivacyLink}</Link> <span className="text-red-500">*</span>
						</span>
					</label>
				</div>
			</div>

			{error && (
				<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
					{error}
				</div>
			)}

			<Button
				type="submit"
				loading={loading}
				size="lg"
				className="onboarding-btn-primary w-full rounded-xl py-5 text-sm font-semibold sm:text-base"
			>
				{t.continue}
			</Button>
		</form>
	);
}
