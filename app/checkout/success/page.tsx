import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { CheckoutSuccessFinalize } from "@/components/onboarding/payments/CheckoutSuccessFinalize";
import { LandingLogo } from "@/components/ui/logo/landing-logo";
import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import { getCheckoutCopy } from "@/lib/plans/checkout-copy";
import { getCurrentLocale } from "../../../lib/i18n/server";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/** @service-role capability-token
 *
 * Solo lectura por `payment_reference` (id de orden de PayPal o referencia manual): la
 * conoce quien pagó. Antes se leía con la sesión anónima y la RLS lo impedía, así que la
 * página decía "no pudimos verificar" aunque el pago estuviera hecho.
 */

type SearchParams = Record<string, string | string[] | undefined>;

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

const statusBadge: Record<string, "success" | "warning" | "destructive" | "neutral"> = {
  paid: "success",
  approved: "success",
  pending: "warning",
  pending_validation: "warning",
  rejected: "destructive",
  cancelled: "destructive",
};

const statusLabel: Record<string, string> = {
  paid: "Pagado",
  approved: "Pagado",
  pending: "Pendiente",
  pending_validation: "En revisión",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

function isSafeReference(ref: string | undefined): ref is string {
  return Boolean(ref && ref.length <= 100 && /^[A-Za-z0-9_-]+$/.test(ref));
}


async function getPayment(ref?: string) {
  if (!isSafeReference(ref)) {
    return null;
  }

  const supabase = supabaseAdmin;
  const { data, error } = await supabase
    .from("payments_history")
    .select("id,company_id,plan_id,amount_paid,months_paid,status,payment_method")
    .eq("payment_reference", ref)
    .maybeSingle();

  if (error || !data) {
    const { data: app } = await supabase
      .from("onboarding_applications")
      .select("business_name,plan_id,company_id,subscription_payment_method,payment_status,payment_reference,payment_amount,payment_months")
      .eq("payment_reference", ref)
      .maybeSingle();

    if (!app) {
      return null;
    }

    const [{ data: company }, { data: plan }] = await Promise.all([
      app.company_id
        ? supabase.from("companies").select("name").eq("id", app.company_id).maybeSingle()
        : Promise.resolve({ data: null as { name?: string | null } | null }),
      supabase.from("plans").select("name").eq("id", app.plan_id).maybeSingle(),
    ]);

    return {
      id: app.payment_reference ?? ref ?? "",
      company_id: app.company_id,
      plan_id: app.plan_id,
      amount_paid: Number(app.payment_amount ?? 0) || 0,
      months_paid: app.payment_months ?? 1,
      status: app.payment_status ?? "pending",
      payment_method: app.subscription_payment_method ?? null,
      companyName: company?.name ?? app.business_name ?? "--",
      planName: plan?.name ?? "--",
    };
  }

  const [{ data: company }, { data: plan }] = await Promise.all([
    supabase
      .from("companies")
      .select("name")
      .eq("id", data.company_id)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("name")
      .eq("id", data.plan_id)
      .maybeSingle(),
  ]);

  return {
    ...data,
    companyName: company?.name ?? "--",
    planName: plan?.name ?? "--",
  };
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = await getCurrentLocale();
  const copy = getCheckoutCopy(locale).success;
  const resolvedParams = await searchParams;
  const ref = Array.isArray(resolvedParams.ref)
    ? resolvedParams.ref[0]
    : resolvedParams.ref;
  const captureErrorRaw = Array.isArray(resolvedParams.error) ? resolvedParams.error[0] : resolvedParams.error;
  const captureError = captureErrorRaw ? captureErrorRaw.slice(0, 200) : undefined;
  const payment = await getPayment(ref);
  const supportEmail = LANDING_SUPPORT_EMAIL;
  const accountHref = payment?.company_id ? "/cuenta" : "/login";
  const hasReference = Boolean(ref);
  const hasPayment = Boolean(payment);

  const rows = payment
    ? [
        { label: copy.companyLabel, value: payment.companyName },
        { label: copy.planLabel, value: payment.planName },
        { label: copy.monthsLabel, value: String(payment.months_paid ?? 1) },
        { label: copy.methodLabel, value: payment.payment_method ?? "—" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <header className="border-b border-slate-200/80 px-5 sm:px-8">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4F5BFF]/40">
            <LandingLogo forceLightText />
          </Link>
          <a href={`mailto:${supportEmail}`} className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline">
            {copy.supportButton}
          </a>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
          <section className="min-w-0 max-w-2xl">
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full ${hasPayment ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
            >
              {hasPayment ? <CheckCircle className="h-6 w-6" aria-hidden /> : <AlertTriangle className="h-6 w-6" aria-hidden />}
            </span>
            <h1 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {hasPayment ? copy.titlePaid : copy.titleFallback}
            </h1>
            <p className="mt-3 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              {hasPayment ? copy.leadPaid : copy.leadFallback}
            </p>

            <div className="mt-6">
              <CheckoutSuccessFinalize refParam={ref} captureError={captureError} />
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={accountHref}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {hasPayment ? copy.accountButtonPaid : copy.accountButtonFallback}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!hasPayment ? (
                <Link
                  href="/onboarding"
                  className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  {copy.onboardingButton}
                </Link>
              ) : null}
            </div>

            {!hasReference ? (
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <div>
                  <p className="font-semibold">{copy.noReferenceTitle}</p>
                  <p className="mt-1 text-amber-800">{copy.noReferenceText}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-12 border-t border-slate-200 pt-8">
              <h2 className="text-base font-semibold text-slate-900">{copy.stepLabel}</h2>
              <p className="mt-1 text-[15px] text-slate-600">{copy.stepText}</p>
              <dl className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-semibold text-slate-900">{copy.validationTitle}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600">{copy.validationText}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-slate-900">{copy.recoveryTitle}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600">{copy.recoveryText}</dd>
                </div>
              </dl>
              <p className="mt-6 text-sm leading-relaxed text-slate-500">{copy.finalizeNote}</p>
            </div>
          </section>

          <aside className="min-w-0 lg:pt-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.25)] sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{hasPayment ? copy.detailTitle : copy.noPaymentTitle}</h2>
                {payment ? (
                  <Badge variant={statusBadge[payment.status ?? "neutral"] ?? "neutral"}>{statusLabel[payment.status ?? ""] ?? payment.status ?? "—"}</Badge>
                ) : null}
              </div>
              {payment ? (
                <dl className="mt-4 divide-y divide-slate-100 text-sm">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4 py-3">
                      <dt className="text-slate-500">{row.label}</dt>
                      <dd className="text-right font-medium text-slate-900">{row.value}</dd>
                    </div>
                  ))}
                  <div className="py-3">
                    <dt className="text-slate-500">{copy.referenceLabel}</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-slate-700">{ref}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.noPaymentText}</p>
              )}
            </div>
            <p className="mt-4 px-1 text-sm text-slate-500">
              {copy.supportLabel}:{" "}
              <a href={`mailto:${supportEmail}`} className="font-medium text-slate-700 underline-offset-4 hover:underline">
                {supportEmail}
              </a>
            </p>
          </aside>
        </div>
      </main>
    </div>
  );
}
