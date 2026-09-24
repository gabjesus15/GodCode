"use client";

import { Suspense, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import { AlertCircle, Check, Clock, Copy, MailCheck, Upload } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { OnboardingStepBar } from "@/components/onboarding/steps/OnboardingStepBar";
import { uploadImage } from "@/lib/storage/upload-image-client";
import { getOnboardingPaymentCopy } from "@/lib/plans/onboarding-payment-copy";

function getConfigLabel(key: string, labels: Record<string, string>): string {
	return labels[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

type ManualData = {
	amount_usd: number;
	months: number;
	granted_months?: number;
	promo_applied?: boolean;
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
	const cryptoObj = typeof window !== "undefined" ? window.crypto : (typeof globalThis !== "undefined" ? globalThis.crypto : undefined);
	if (cryptoObj) {
		if (typeof cryptoObj.randomUUID === "function") {
			return `${prefix}_${cryptoObj.randomUUID()}`;
		}
		if (typeof cryptoObj.getRandomValues === "function") {
			const array = new Uint32Array(2);
			cryptoObj.getRandomValues(array);
			return `${prefix}_${Date.now()}_${array[0].toString(36)}${array[1].toString(36)}`;
		}
	}
	const timePart = Date.now().toString(36);
	const perfPart = typeof performance !== "undefined" ? Math.floor(performance.now() * 1000).toString(36) : "";
	return `${prefix}_${timePart}_${perfPart}`;
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


type Quote = {
	plan: { name: string; monthly: number };
	addons: Array<{ name: string; unit: number; quantity: number; monthly: boolean }>;
	method: { slug: string; name: string } | null;
};

const usdFormatter = new Intl.NumberFormat("es-CL", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const usd = (value: number) => usdFormatter.format(value);

function capitalize(value: string): string {
	return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function CopyValue({ value, copyLabel, copiedLabel }: { value: string; copyLabel: string; copiedLabel: string }) {
	const [copied, setCopied] = useState(false);
	return (
		<button
			type="button"
			onClick={() => {
				void navigator.clipboard?.writeText(value).then(() => {
					setCopied(true);
					window.setTimeout(() => setCopied(false), 1500);
				});
			}}
			className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 font-sans text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
			aria-label={`${copyLabel}: ${value}`}
		>
			{copied ? <Check className="h-3.5 w-3.5 text-emerald-600" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
			{copied ? copiedLabel : copyLabel}
		</button>
	);
}

function StatusCard({
	tone,
	title,
	body,
	actionLabel,
	actionHref,
	step = false,
}: {
	tone: "error" | "done" | "review";
	title: string;
	body: string;
	actionLabel?: string;
	actionHref?: string;
	step?: boolean;
}) {
	const Icon = tone === "error" ? AlertCircle : tone === "review" ? Clock : MailCheck;
	const iconClass = tone === "error" ? "bg-red-50 text-red-600" : tone === "review" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700";
	return (
		<main className="mx-auto w-full max-w-xl px-5 py-10 sm:px-8 sm:py-16">
			{step ? <OnboardingStepBar current={3} compact /> : null}
			<div className="rounded-2xl border border-slate-200 p-6 sm:p-8" role={tone === "error" ? "alert" : "status"}>
				<span className={`flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
					<Icon className="h-5 w-5" aria-hidden />
				</span>
				<h1 className="mt-5 text-xl font-semibold text-slate-900">{title}</h1>
				<p className="mt-2 text-[15px] leading-relaxed text-slate-600">{body}</p>
				{actionLabel && actionHref ? (
					<Link href={actionHref} className="onboarding-btn-primary mt-6 inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm">
						{actionLabel}
					</Link>
				) : null}
			</div>
		</main>
	);
}

function PagoContent() {
  const locale = useLocale();
  const copy = getOnboardingPaymentCopy(locale);
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
	const [promoAvailable, setPromoAvailable] = useState(false);
	const [subscriptionMethod, setSubscriptionMethod] = useState<string>("");
	// Estado de la solicitud: evita ofrecer "Ir a pagar" antes de saber el método o si ya pagó.
	const [appLoaded, setAppLoaded] = useState(false);
	const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
	const [receiptUploaded, setReceiptUploaded] = useState(false);
	const [paypalClientId, setPaypalClientId] = useState<string>("");
	const [paypalSdkReady, setPaypalSdkReady] = useState(false);
	const [quote, setQuote] = useState<Quote | null>(null);
	const [businessName, setBusinessName] = useState("");
	const paypalContainerId = "onboarding-paypal-buttons";

	const isVenezuela = manualData?.country === "Venezuela" || manualData?.country === "VE";
	const isPaypalSelected = subscriptionMethod === "paypal";
	const grantedMonths = promoAvailable ? months + 1 : months;

	function formatPromoDescription(paid: number, granted: number): string {
		const paidText = `${paid} ${paid === 1 ? copy.monthsLabelSingular : copy.monthsLabelPlural}`;
		const grantedText = `${granted} ${granted === 1 ? copy.monthsLabelSingular : copy.monthsLabelPlural}`;
		return copy.promoDescription.replace("{paid}", paidText).replace("{granted}", grantedText);
	}

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
			.then((data: {
				subscription_payment_method?: string | null;
				promo_available?: boolean;
				payment_status?: string | null;
				receipt_uploaded?: boolean;
				business_name?: string | null;
				quote?: Quote | null;
			}) => {
				if (cancelled) return;
				setSubscriptionMethod((data.subscription_payment_method ?? "").trim().toLowerCase());
				setPromoAvailable(data.promo_available === true);
				setPaymentStatus(data.payment_status ?? null);
				setReceiptUploaded(data.receipt_uploaded === true);
				setBusinessName(String(data.business_name ?? "").trim());
				setQuote(data.quote ?? null);
			})
			.catch(() => {
				if (!cancelled) {
					setSubscriptionMethod("");
					setPromoAvailable(false);
				}
			})
			.finally(() => {
				if (!cancelled) setAppLoaded(true);
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
				granted_months?: number;
				promo_applied?: boolean;
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
					granted_months: data.granted_months,
					promo_applied: data.promo_applied,
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

	const ui = copy.ui;
	const monthsText = (n: number) => `${n} ${n === 1 ? copy.monthsLabelSingular : copy.monthsLabelPlural}`;
	/** Mismo cálculo que el checkout: plan × meses + extras mensuales × meses + extras únicos. */
	const totalFor = (m: number): number | null => {
		if (!quote) return null;
		let total = quote.plan.monthly * m;
		for (const addon of quote.addons) total += addon.unit * addon.quantity * (addon.monthly ? m : 1);
		return Math.round(total * 100) / 100;
	};

	if (!token) {
		// Sin enlace no sabemos en qué paso va: no se muestra la barra de pasos (antes
		// marcaba registro y plan como hechos).
		return <StatusCard tone="error" title={copy.noTokenTitle} body={copy.noTokenBody} actionLabel={copy.backHome} actionHref="/onboarding" />;
	}

	const alreadyPaid = paymentStatus === "paid";
	const inReview = !manualData && paymentStatus === "pending_validation" && receiptUploaded;
	if (alreadyPaid || inReview) {
		return (
			<StatusCard
				step
				tone={alreadyPaid ? "done" : "review"}
				title={alreadyPaid ? copy.alreadyPaidTitle : copy.manualSuccessTitle}
				body={alreadyPaid ? copy.alreadyPaidBody : copy.manualSuccessBody}
				actionLabel={alreadyPaid ? copy.loginLabel : undefined}
				actionHref={alreadyPaid ? "/login" : undefined}
			/>
		);
	}

	const methodName = quote?.method?.name ?? (isPaypalSelected ? "PayPal" : "");
	const chargedMonths = manualData ? manualData.months : months;
	const coveredMonths = manualData ? manualData.granted_months ?? manualData.months : grantedMonths;
	const total = manualData ? manualData.amount_usd : totalFor(months);

	const summary = (
		<aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
			<div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.25)] sm:p-6">
				<h2 className="text-base font-semibold text-slate-900">{ui.summaryTitle}</h2>
				{businessName ? <p className="mt-0.5 text-sm text-slate-500">{businessName}</p> : null}
				<ul className="mt-4 space-y-3 text-sm">
					{quote ? (
						<>
							<li className="flex items-start justify-between gap-4">
								<span className="text-slate-600">{ui.planLine.replace("{name}", quote.plan.name)}</span>
								<span className="whitespace-nowrap font-medium text-slate-900">
									{usd(quote.plan.monthly)}
									{ui.perMonth}
								</span>
							</li>
							{quote.addons
								.filter((addon) => addon.unit > 0)
								.map((addon) => (
									<li key={addon.name} className="flex items-start justify-between gap-4">
										<span className="text-slate-600">
											{addon.name}
											{addon.quantity > 1 ? ` × ${addon.quantity}` : ""}
										</span>
										<span className="whitespace-nowrap font-medium text-slate-900">
											{usd(addon.unit * addon.quantity)}
											{addon.monthly ? ui.perMonth : ""}
										</span>
									</li>
								))}
						</>
					) : planSummary ? (
						<li className="flex items-start justify-between gap-4">
							<span className="text-slate-600">{ui.planLine.replace("{name}", planSummary.name)}</span>
							<span className="whitespace-nowrap font-medium text-slate-900">
								{usd(planSummary.price)}
								{ui.perMonth}
							</span>
						</li>
					) : (
						<li className="h-5 animate-pulse rounded bg-slate-100" aria-hidden />
					)}
					<li className="flex items-start justify-between gap-4">
						<span className="text-slate-600">{capitalize(copy.monthSummaryLabel)}</span>
						<span className="whitespace-nowrap font-medium text-slate-900">{monthsText(chargedMonths)}</span>
					</li>
				</ul>
				<div className="mt-4 border-t border-slate-100 pt-4">
					<div className="flex items-baseline justify-between gap-4">
						<span className="text-sm font-semibold text-slate-900">{ui.totalLabel}</span>
						<span className="text-2xl font-semibold tracking-tight text-slate-900">{total != null ? usd(total) : "—"}</span>
					</div>
					{coveredMonths > chargedMonths ? (
						<p className="mt-2 text-sm font-medium text-[#3640C9]">{ui.coverage.replace("{months}", monthsText(coveredMonths))}</p>
					) : null}
				</div>
				{methodName ? (
					<div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
						<p className="font-medium text-slate-900">{ui.payWith.replace("{method}", methodName)}</p>
						<p className="mt-0.5 text-slate-500">{isPaypalSelected ? ui.paypalActivation : ui.manualActivation}</p>
					</div>
				) : null}
				<Link href={changeMethodHref} className="onboarding-link mt-4 inline-block text-sm font-medium">
					{ui.changeLink}
				</Link>
			</div>

			<div className="mt-6 px-1">
				<h2 className="text-sm font-semibold text-slate-900">{ui.nextTitle}</h2>
				<ol className="mt-3 space-y-2.5">
					{ui.nextSteps.map((stepText, index) => (
						<li key={stepText} className="flex gap-3 text-sm text-slate-600">
							<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-[11px] font-semibold text-slate-600">
								{index + 1}
							</span>
							{stepText}
						</li>
					))}
				</ol>
			</div>
		</aside>
	);

	/* ── Pago manual: datos para transferir y comprobante ── */
	if (manualData) {
		const configEntries = Object.entries(manualData.method_config).filter(([, value]) => Boolean(value));
		return (
			<main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-14">
				<OnboardingStepBar current={3} />
				<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
					<section className="min-w-0 max-w-2xl">
						{referenceSubmitted ? (
							<div className="rounded-2xl border border-slate-200 p-6 sm:p-8" role="status">
								<span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
									<MailCheck className="h-5 w-5" aria-hidden />
								</span>
								<h1 className="mt-5 text-xl font-semibold text-slate-900">{ui.submittedTitle}</h1>
								<p className="mt-2 text-[15px] leading-relaxed text-slate-600">{ui.submittedBody}</p>
							</div>
						) : (
							<>
								<h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{methodName || copy.manualTitle}</h1>
								<p className="mt-3 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
									{copy.paymentInstructionsFallback[manualData.method_slug] ?? copy.supportHint}
								</p>

								<ol className="mt-10 space-y-10">
									<li>
										<h2 className="flex items-center gap-3 text-base font-semibold text-slate-900">
											<span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">1</span>
											{ui.transferStep}
										</h2>
										<div className="mt-4 rounded-2xl border border-slate-200 p-5 sm:p-6">
											<p className="text-sm text-slate-500">{copy.amountLabel}</p>
											<p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{usd(manualData.amount_usd)}</p>
											{isVenezuela && bcvRate != null ? (
												<p className="mt-2 text-sm text-slate-600">
													{copy.approxLabel}: <strong className="font-semibold text-slate-900">{(manualData.amount_usd * bcvRate).toFixed(2)} VES</strong>
													<span className="mt-0.5 block text-xs text-slate-500">{copy.referenceNote}</span>
												</p>
											) : null}
											<dl className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
												{configEntries.map(([key, value]) => (
													<div key={key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
														<dt className="text-sm text-slate-500">{getConfigLabel(key, copy.configLabels)}</dt>
														<dd className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-900">
															<span className="break-all">{value}</span>
															<CopyValue value={value} copyLabel={ui.copy} copiedLabel={ui.copied} />
														</dd>
													</div>
												))}
												<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
													<dt className="text-sm text-slate-500">{ui.referenceLabel}</dt>
													<dd className="flex min-w-0 items-center gap-2 font-mono text-sm text-slate-900">
														<span className="break-all">{manualData.payment_reference}</span>
														<CopyValue value={manualData.payment_reference} copyLabel={ui.copy} copiedLabel={ui.copied} />
													</dd>
												</div>
											</dl>
										</div>
									</li>
									<li>
										<h2 className="flex items-center gap-3 text-base font-semibold text-slate-900">
											<span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">2</span>
											{ui.uploadStep}
										</h2>
										<label className="mt-4 flex cursor-pointer flex-wrap items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-5 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#4F5BFF]/60">
											<span className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800">
												<Upload className="h-4 w-4" aria-hidden />
												{ui.chooseFile}
											</span>
											<span className="min-w-0 break-all text-sm text-slate-500">{referenceFile?.name ?? ui.noFile}</span>
											<input
												type="file"
												accept="image/jpeg,image/png,image/webp"
												aria-describedby="receipt-hint"
												className="sr-only"
												onChange={(e) => setReferenceFile(e.target.files?.[0] ?? null)}
											/>
										</label>
										<p id="receipt-hint" className="mt-2 text-xs text-slate-500">
											{copy.uploadHint}
										</p>
										{error ? (
											<p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
												{error}
											</p>
										) : null}
										<Button
											onClick={handleSubmitReference}
											loading={referenceUploading}
											disabled={!referenceFile}
											size="lg"
											className="onboarding-btn-primary mt-5 h-12 w-full rounded-xl text-[15px] sm:w-auto sm:px-8"
										>
											{copy.uploadButton}
										</Button>
									</li>
								</ol>
							</>
						)}
					</section>
					{summary}
				</div>
			</main>
		);
	}

	/* ── Elegir meses y pagar ── */
	return (
		<main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-14">
			<OnboardingStepBar current={3} />
			<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
				<section className="min-w-0 max-w-2xl">
					<h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{copy.title}</h1>
					<p className="mt-3 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">{copy.subtitle}</p>

					{promoAvailable ? (
						<div className="mt-8 rounded-2xl border border-[#D5D9FF] bg-[#F1F2FF] px-5 py-4">
							<p className="text-sm font-semibold text-[#3640C9]">{copy.promoTitle}</p>
							<p className="mt-0.5 text-sm text-slate-700">{formatPromoDescription(months, grantedMonths)}</p>
						</div>
					) : null}

					<fieldset className="mt-8">
						<legend className="text-base font-semibold text-slate-900">{copy.monthsPrompt}</legend>
						<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
							{[1, 3, 6, 12].map((m) => {
								const optionTotal = totalFor(m);
								const selected = months === m;
								return (
									<label
										key={m}
										data-selected={selected}
										className="onboarding-option flex cursor-pointer flex-col rounded-2xl p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#4F5BFF]/60"
									>
										<input type="radio" name="months" value={m} checked={selected} onChange={() => setMonths(m)} className="sr-only" />
										<span className="text-sm font-semibold text-slate-900">{monthsText(m)}</span>
										<span className="mt-1 text-sm text-slate-600">{optionTotal != null ? usd(optionTotal) : "—"}</span>
										{promoAvailable ? <span className="mt-2 text-xs font-medium text-[#3640C9]">{ui.freeMonth}</span> : null}
									</label>
								);
							})}
						</div>
					</fieldset>

					{paymentStatus === "rejected" && !error ? (
						<div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
							{copy.rejectedNotice}
						</div>
					) : null}

					{error ? (
						<div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
							{error}
						</div>
					) : null}

					<div className="mt-8">
						{!appLoaded ? <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100 sm:w-72" aria-hidden /> : null}
						{appLoaded && !isPaypalSelected ? (
							<Button onClick={handlePay} loading={loading} size="lg" className="onboarding-btn-primary h-12 w-full rounded-xl text-[15px] sm:w-auto sm:px-8">
								{ui.showBankDetails}
							</Button>
						) : null}
						{isPaypalSelected ? (
							<div className="rounded-2xl border border-slate-200 p-5 sm:p-6">
								<p className="text-sm font-semibold text-slate-900">{copy.paypalInlineTitle}</p>
								<p className="mt-1 text-sm text-slate-500">{copy.paypalInlineHint}</p>
								{paypalSdkReady ? (
									<div id={paypalContainerId} className="mt-4 min-h-[44px] max-w-md" />
								) : (
									<p className="mt-4 text-sm text-slate-500">{copy.paypalInlineLoading}</p>
								)}
							</div>
						) : null}
					</div>

					<p className="mt-5 text-xs leading-relaxed text-slate-500">{copy.footerNote}</p>
				</section>
				{summary}
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
