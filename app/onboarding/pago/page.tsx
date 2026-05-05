"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

import { Button } from "../../../components/ui/button";
import { OnboardingStepBar } from "@/components/onboarding/steps/OnboardingStepBar";
import { uploadImage } from "../../../components/tenant/utils/cloudinary";
import { getOnboardingPaymentCopy } from "@/lib/plans/onboarding-payment-copy";

function getConfigLabel(key: string, labels: Record<string, string>): string {
	return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ManualData = {
	amount_usd: number;
	months: number;
	currency: string;
	country: string | null;
	method_slug: string;
	method_config: Record<string, string>;
	payment_reference: string;
};

type PayPalWindow = Window & {
	paypal?: {
		Buttons: (config: {
			createOrder: () => Promise<string>;
			onApprove: (data: { orderID?: string }) => Promise<void>;
			onError?: (err: unknown) => void;
			onCancel?: () => void;
		}) => { render: (selector: string) => Promise<void> };
	};
};

function parseJsonObject(text: string): Record<string, unknown> {
	if (!text) return {};
	try {
		const parsed = JSON.parse(text);
		if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
	} catch {
		// Ignore invalid JSON payloads.
	}
	return {};
}

const VISITOR_KEY = "gc_visitor_id";
const SESSION_KEY = "gc_session_id";

function randomId(prefix: string): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return `${prefix}_${crypto.randomUUID()}`;
	}
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getOrCreateStorageId(storage: "local" | "session", key: string, prefix: string): string {
	if (typeof window === "undefined") return randomId(prefix);
	try {
		const api = storage === "local" ? window.localStorage : window.sessionStorage;
		const existing = api.getItem(key);
		if (existing && existing.trim()) return existing;
		const created = randomId(prefix);
		api.setItem(key, created);
		return created;
	} catch {
		return randomId(prefix);
	}
}

function trackAnalyticsEvent(event: string, metadata?: Record<string, unknown>) {
	if (typeof window === "undefined") return;
	const payload = {
		event,
		path: "/onboarding/pago",
		referrer: document.referrer || null,
		title: document.title || null,
		visitorId: getOrCreateStorageId("local", VISITOR_KEY, "v"),
		sessionId: getOrCreateStorageId("session", SESSION_KEY, "s"),
		metadata: metadata ?? {},
	};
	const body = JSON.stringify(payload);

	try {
		if (navigator.sendBeacon) {
			const blob = new Blob([body], { type: "application/json" });
			navigator.sendBeacon("/api/analytics/events", blob);
			return;
		}
	} catch {
		// Ignore and use fetch fallback below.
	}

	void fetch("/api/analytics/events", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
		keepalive: true,
		cache: "no-store",
	}).catch(() => {});
}

function getChangeMethodLabel(locale: string): string {
	switch (locale) {
		case "en":
			return "Change payment method";
		case "pt":
			return "Alterar método de pagamento";
		case "fr":
			return "Changer le mode de paiement";
		case "de":
			return "Zahlungsmethode ändern";
		case "it":
			return "Cambia metodo di pagamento";
		default:
			return "Cambiar metodo de pago";
	}
}

function PagoContent() {
  const locale = useLocale();
  const copy = getOnboardingPaymentCopy(locale);
	const changeMethodLabel = getChangeMethodLabel(locale);
	const searchParams = useSearchParams();
	const token = searchParams ? searchParams.get("token") : null;
	const changeMethodHref = token
		? `/onboarding/complete?token=${encodeURIComponent(token)}#payment-method`
		: "/onboarding/complete";
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [months, setMonths] = useState(1);
	const [manualData, setManualData] = useState<ManualData | null>(null);
	const [bcvRate, setBcvRate] = useState<number | null>(null);
	const [referenceFile, setReferenceFile] = useState<File | null>(null);
	const [referenceUploading, setReferenceUploading] = useState(false);
	const [referenceSubmitted, setReferenceSubmitted] = useState(false);
	const [planSummary, setPlanSummary] = useState<{ name: string; price: number; addons: Array<{ name: string; price: number }> } | null>(null);
	const [subscriptionMethod, setSubscriptionMethod] = useState<string>("");
	const [paypalClientId, setPaypalClientId] = useState<string>("");
	const [paypalSdkReady, setPaypalSdkReady] = useState(false);
	const paypalContainerId = "onboarding-paypal-buttons";

	const isVenezuela = manualData?.country === "Venezuela" || manualData?.country === "VE";
	const isPaypalSelected = subscriptionMethod === "paypal";

	useEffect(() => {
		if (!isVenezuela) return;
		let cancelled = false;
		fetch("/api/onboarding/bcv-rate")
			.then((r) => r.json())
			.then((d: { rate?: number }) => {
				if (!cancelled && typeof d.rate === "number") setBcvRate(d.rate);
			})
			.catch(() => {});
		return () => { cancelled = true; };
	}, [isVenezuela]);

	useEffect(() => {
		if (!token) return;
		let cancelled = false;
		fetch(`/api/onboarding/application?token=${encodeURIComponent(token)}`)
			.then((r) => r.json())
			.then((data: { subscription_payment_method?: string | null }) => {
				if (cancelled) return;
				setSubscriptionMethod((data.subscription_payment_method ?? "").trim().toLowerCase());
			})
			.catch(() => {
				if (!cancelled) setSubscriptionMethod("");
			});
		return () => {
			cancelled = true;
		};
	}, [token]);

	useEffect(() => {
		if (!isPaypalSelected) return;
		let cancelled = false;
		fetch("/api/onboarding/paypal-client")
			.then((r) => r.json())
			.then((data: { clientId?: string }) => {
				if (!cancelled && typeof data.clientId === "string") setPaypalClientId(data.clientId);
			})
			.catch(() => {
				if (!cancelled) setPaypalClientId("");
			});
		return () => {
			cancelled = true;
		};
	}, [isPaypalSelected]);

	useEffect(() => {
		if (!isPaypalSelected || !paypalClientId || paypalSdkReady) return;
		const script = document.createElement("script");
		script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=USD&intent=capture`;
		script.async = true;
		script.onload = () => setPaypalSdkReady(true);
		script.onerror = () => setError(copy.errors.unexpected);
		document.body.appendChild(script);
	}, [isPaypalSelected, paypalClientId, paypalSdkReady, copy.errors.unexpected]);

	useEffect(() => {
		if (!isPaypalSelected) return;
		trackAnalyticsEvent("onboarding_paypal_inline_view", { months });
	}, [isPaypalSelected, months]);

	const createPaypalOrder = useCallback(async (): Promise<string> => {
		if (!token) {
			throw new Error(copy.errors.createSession);
		}

		trackAnalyticsEvent("onboarding_paypal_inline_attempt", { months });
		setError(null);
		setLoading(true);
		try {
			const res = await fetch("/api/onboarding/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, months }),
			});

			const raw = await res.text();
			const payload = parseJsonObject(raw);
			const data = payload as {
				error?: string;
				sessionId?: string;
				plan_name?: string;
				plan_price?: number;
				addons?: Array<{ name: string; price: number }>;
			};

			if (!res.ok) {
				const fallback = raw && raw.trim() ? raw.trim() : copy.errors.createSession;
				throw new Error(data.error ?? fallback);
			}

			if (data.plan_name && typeof data.plan_price === "number") {
				setPlanSummary({
					name: data.plan_name,
					price: data.plan_price,
					addons: Array.isArray(data.addons) ? data.addons : [],
				});
			}

			if (!data.sessionId) {
				throw new Error(copy.errors.missingUrl);
			}

			return data.sessionId;
		} finally {
			setLoading(false);
		}
	}, [token, months, copy.errors.createSession, copy.errors.missingUrl]);

	useEffect(() => {
		if (!isPaypalSelected || !paypalSdkReady) return;
		const container = document.getElementById(paypalContainerId);
		if (!container) return;
		container.innerHTML = "";

		const w = window as PayPalWindow;
		if (!w.paypal) return;

		w.paypal
			.Buttons({
				createOrder: async () => {
					try {
						return await createPaypalOrder();
					} catch (err) {
						const message = err instanceof Error ? err.message : copy.errors.unexpected;
						setError(message);
						throw err;
					}
				},
				onApprove: async (data) => {
					trackAnalyticsEvent("onboarding_paypal_inline_approved", {
						orderId: data.orderID ?? null,
						months,
					});
					if (!data.orderID) {
						setError(copy.errors.unexpected);
						return;
					}
					const res = await fetch("/api/onboarding/paypal-capture-order", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ orderId: data.orderID, token }),
					});
					const json = (await res.json().catch(() => ({}))) as { error?: string; ref?: string };
					if (!res.ok) {
						trackAnalyticsEvent("onboarding_paypal_inline_capture_error", {
							orderId: data.orderID,
							message: json.error ?? "unknown_error",
						});
						setError(json.error ?? copy.errors.unexpected);
						return;
					}
					const ref = typeof json.ref === "string" && json.ref.trim() ? json.ref : data.orderID;
					trackAnalyticsEvent("onboarding_paypal_inline_captured", {
						orderId: data.orderID,
						ref,
						months,
					});
					window.location.href = `/checkout/success?ref=${encodeURIComponent(ref)}`;
				},
				onCancel: () => {
					trackAnalyticsEvent("onboarding_paypal_inline_canceled", { months });
					setError(copy.errors.paypalCanceled);
				},
				onError: (err: unknown) => {
					trackAnalyticsEvent("onboarding_paypal_inline_error", { months });
					const message = err instanceof Error ? err.message : copy.errors.unexpected;
					setError(message);
				},
			})
			.render(`#${paypalContainerId}`)
			.catch((err: unknown) => {
				trackAnalyticsEvent("onboarding_paypal_inline_render_error", { months });
				const message = err instanceof Error ? err.message : copy.errors.unexpected;
				setError(message);
			});
	}, [
		isPaypalSelected,
		paypalSdkReady,
		createPaypalOrder,
		token,
		months,
		copy.errors.unexpected,
		copy.errors.paypalCanceled,
	]);

	const handlePay = useCallback(async () => {
		if (!token) return;
		setLoading(true);
		setError(null);
		setManualData(null);

		try {
			const res = await fetch("/api/onboarding/checkout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, months }),
			});

			const raw = await res.text();
			const data = parseJsonObject(raw) as {
				error?: string;
				url?: string;
				manual?: boolean;
				payment_reference?: string;
				amount_usd?: number;
				months?: number;
				currency?: string;
				country?: string | null;
				method_slug?: string;
				method_config?: Record<string, string>;
				plan_name?: string;
				plan_price?: number;
				addons?: Array<{ name: string; price: number }>;
			};

			if (!res.ok) {
				const message = typeof data?.error === "string" && data.error.trim()
					? data.error
					: (raw && raw.trim() ? raw.trim() : copy.errors.createSession);
				throw new Error(message);
			}

			if (data.plan_name && data.plan_price) {
				setPlanSummary({
					name: data.plan_name,
					price: data.plan_price,
					addons: Array.isArray(data.addons) ? data.addons : [],
				});
			}

			if (data.url) {
				window.location.href = data.url;
				return;
			}

			if (data.manual === true && data.payment_reference) {
				setManualData({
					amount_usd: data.amount_usd ?? 0,
					months: data.months ?? 1,
					currency: data.currency ?? "USD",
					country: data.country ?? null,
					method_slug: data.method_slug ?? "",
					method_config: data.method_config ?? {},
					payment_reference: data.payment_reference,
				});
				return;
			}

			throw new Error(copy.errors.missingUrl);
		} catch (err) {
			setError(err instanceof Error ? err.message : copy.errors.unexpected);
		} finally {
			setLoading(false);
		}
	}, [token, months, copy]);

	const handleSubmitReference = useCallback(async () => {
		if (!token || !manualData || !referenceFile) {
			setError(copy.errors.missingReceipt);
			return;
		}
		setReferenceUploading(true);
		setError(null);
		try {
			const url = await uploadImage(referenceFile, "onboarding");
			const res = await fetch("/api/onboarding/upload-payment-reference", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					token,
					payment_reference: manualData.payment_reference,
					reference_file_url: url,
				}),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(json.error ?? copy.errors.uploadError);
			setReferenceSubmitted(true);
			setReferenceFile(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : copy.errors.uploadError);
		} finally {
			setReferenceUploading(false);
		}
	}, [token, manualData, referenceFile, copy]);

	if (!token) {
		return (
			<main className="onboarding-main relative mx-auto w-full max-w-lg px-5 py-8 sm:px-6 sm:py-12 md:py-16">
				<OnboardingStepBar current={3} />
				<div className="onboarding-card max-w-md p-6 text-center sm:p-8">
					<p className="text-sm text-red-600">{copy.noTokenTitle}. {copy.noTokenBody}</p>
					<Link href="/onboarding" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
						{copy.backHome}
					</Link>
				</div>
			</main>
		);
	}

	/* ── Manual payment ── */
	if (manualData) {
		return (
			<main className="onboarding-main relative mx-auto max-w-lg px-5 py-8 sm:px-6 sm:py-12 md:py-16">
				<OnboardingStepBar current={3} />
				<div className="mb-5 text-center">
					<Link
						href={changeMethodHref}
						className="inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{changeMethodLabel}
					</Link>
				</div>
				<div className="onboarding-card space-y-5 p-5 sm:p-7">
					{referenceSubmitted ? (
						<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm">
							<p className="font-medium text-emerald-800">{copy.manualSuccessTitle}</p>
							<p className="mt-2 text-emerald-700">{copy.manualSuccessBody}</p>
						</div>
					) : (
						<>
							<div>
								<p className="text-sm font-medium text-slate-500">{copy.amountLabel}</p>
								<p className="mt-1 text-2xl font-bold text-slate-900">
									${manualData.amount_usd.toFixed(2)} USD
									{manualData.months > 1 && (
										<span className="ml-2 text-base font-normal text-slate-400">({manualData.months} {manualData.months === 1 ? copy.monthsLabelSingular : copy.monthsLabelPlural})</span>
									)}
								</p>
							</div>
							{isVenezuela && bcvRate != null && (
								<div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
									<p className="text-slate-500">{copy.approxLabel}:</p>
									<p className="font-semibold text-slate-900">{(manualData.amount_usd * bcvRate).toFixed(2)} VES</p>
									<p className="mt-1 text-xs text-slate-400">{copy.referenceNote}</p>
								</div>
							)}
							<div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-4 text-sm">
								<p className="font-medium text-slate-800">{copy.instructionsTitle}</p>
								<p className="mt-2 text-slate-600">
									{copy.paymentInstructionsFallback[manualData.method_slug] ?? copy.supportHint}
								</p>
								{Object.keys(manualData.method_config).length > 0 && (
									<dl className="mt-3 space-y-1.5 text-sm">
										{Object.entries(manualData.method_config).map(([key, value]) => (
											value ? (
												<div key={key}>
													<dt className="font-medium text-slate-700">{getConfigLabel(key, copy.configLabels)}</dt>
													<dd className="mt-0.5 font-mono text-slate-600">{value}</dd>
												</div>
											) : null
										))}
									</dl>
								)}
							</div>
							<div>
								<label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
									{copy.uploadLabel}
									<input
										type="file"
										accept="image/*,.pdf"
										className="text-sm text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
										onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
									/>
								</label>
								{error && <p className="mt-2 text-sm text-red-600" role="alert">{error}</p>}
								<Button
									onClick={handleSubmitReference}
									loading={referenceUploading}
									disabled={!referenceFile}
									size="lg"
									className="onboarding-btn-primary mt-4 w-full rounded-xl py-5"
								>
									{copy.uploadButton}
								</Button>
							</div>
						</>
					)}
				</div>
			</main>
		);
	}

	/* ── Default checkout ── */
	return (
		<main className="onboarding-main relative mx-auto max-w-lg px-5 py-8 sm:px-6 sm:py-12 md:py-16">
			<OnboardingStepBar current={3} />

			<div className="mb-8 text-center sm:mb-10">
					<h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{copy.title}</h1>
				<p className="mx-auto mt-3 max-w-md text-sm text-slate-500 sm:text-base">
						{copy.subtitle}
				</p>
				<div className="mt-4 flex flex-wrap items-center justify-center gap-3">
					<Link
						href={changeMethodHref}
						className="text-sm font-medium text-indigo-600 hover:underline"
					>
						{copy.backToStep2}
					</Link>
					<Link
						href={changeMethodHref}
						className="inline-block rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{changeMethodLabel}
					</Link>
				</div>
			</div>

			<div className="onboarding-card space-y-5 p-5 sm:p-7">
				{planSummary && (
					<div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
						<div className="font-medium text-slate-900">{copy.planLabel}: {planSummary.name}</div>
						<div className="mt-1 text-slate-600">
							{copy.priceLabel}: <span className="font-semibold text-slate-900">${planSummary.price.toFixed(2)} USD</span>
						</div>
						{planSummary.addons.length > 0 && (
							<div className="mt-2">
								<div className="font-medium text-slate-900">{copy.extrasLabel}:</div>
								<ul className="ml-4 mt-1 list-disc text-slate-600">
									{planSummary.addons.map((addon, idx) => (
										<li key={idx}>{addon.name} <span className="font-semibold">${addon.price.toFixed(2)} USD</span></li>
									))}
								</ul>
							</div>
						)}
					</div>
				)}

				<label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
					{copy.monthsPrompt}
					<select
						value={months}
						onChange={(e) => setMonths(Number(e.target.value))}
						className="onboarding-input h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
					>
						{[1, 3, 6, 12].map((m) => (
							<option key={m} value={m}>
								{m} {m === 1 ? copy.monthsLabelSingular : copy.monthsLabelPlural}
							</option>
						))}
					</select>
				</label>

				{error && (
					<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
						{error}
					</div>
				)}

				{!isPaypalSelected && (
					<Button
						onClick={handlePay}
						loading={loading}
						size="lg"
						className="onboarding-btn-primary w-full rounded-xl py-5 text-sm font-semibold sm:text-base"
					>
						{copy.continueButton}
					</Button>
				)}

				{isPaypalSelected && (
					<div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
						<p className="text-center text-sm font-medium text-slate-800">{copy.paypalInlineTitle}</p>
						<p className="text-center text-xs text-slate-500">{copy.paypalInlineHint}</p>
						{paypalSdkReady ? (
							<div id={paypalContainerId} className="min-h-[44px]" />
						) : (
							<p className="text-center text-xs text-slate-500">{copy.paypalInlineLoading}</p>
						)}
					</div>
				)}

				<p className="text-center text-xs text-slate-400">
					{copy.footerNote}
				</p>
			</div>
		</main>
	);
}

export default function OnboardingPagoPage() {
	return (
		<Suspense fallback={
			<div className="flex min-h-[60vh] items-center justify-center">
				<div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
			</div>
		}>
			<PagoContent />
		</Suspense>
	);
}
