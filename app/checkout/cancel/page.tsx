import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Clock3, ExternalLink, ShieldAlert } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { getCheckoutCopy } from "@/lib/plans/checkout-copy";
import { getCurrentLocale } from "../../../lib/i18n/server";
import { createSupabaseServerClient } from "../../../utils/supabase/server";

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
  rejected: "destructive",
  cancelled: "destructive",
};

function getSupportEmail(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || process.env.RESEND_FROM?.trim() || "hola@godcode.me";
}

async function getPayment(ref?: string) {
  if (!ref) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("payments_history")
    .select("id,company_id,plan_id,amount_paid,months_paid,status,payment_method")
    .eq("payment_reference", ref)
    .maybeSingle();

  if (error || !data) {
    const { data: app } = await supabase
      .from("onboarding_applications")
      .select("business_name,plan_id,company_id,subscription_payment_method,payment_status,payment_reference,payment_amount,payment_months,verification_token")
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
      onboardingToken: app.verification_token ?? null,
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

  const { data: application } = await supabase
    .from("onboarding_applications")
    .select("verification_token")
    .eq("company_id", data.company_id)
    .maybeSingle();

  return {
    ...data,
    companyName: company?.name ?? "--",
    planName: plan?.name ?? "--",
    onboardingToken: application?.verification_token ?? null,
  };
}

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = await getCurrentLocale();
  const copy = getCheckoutCopy(locale).cancel;
  const resolvedParams = await searchParams;
  const ref = Array.isArray(resolvedParams.ref)
    ? resolvedParams.ref[0]
    : resolvedParams.ref;
  const payment = await getPayment(ref);
  const supportEmail = getSupportEmail();
  const retryHref = payment?.onboardingToken
    ? `/onboarding/pago?token=${encodeURIComponent(payment.onboardingToken)}`
    : "/onboarding";
  const recoveryHref = payment?.company_id ? "/cuenta" : "/login";
  const hasReference = Boolean(ref);
  const hasPayment = Boolean(payment);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fef9c3_0%,_#ffffff_45%,_#f8fafc_100%)]">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-24 h-96 w-96 rounded-full bg-rose-200/40 blur-3xl" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-10 sm:py-16">
        <div className="grid w-full gap-8 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="flex flex-col gap-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              {copy.badge}
            </div>

            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-semibold leading-tight text-zinc-900 sm:text-5xl">
                {hasPayment ? copy.titlePaid : copy.titleFallback}
              </h1>
              <p className="max-w-2xl text-base text-zinc-600 sm:text-lg">
                {hasPayment ? copy.leadPaid : copy.leadFallback}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href={recoveryHref} className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800">
                {hasPayment ? copy.accountButtonPaid : copy.accountButtonFallback}
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link href={retryHref} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
                {copy.retryButton}
              </Link>
              <Link href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
                {copy.supportButton}
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{copy.statusLabel}</p>
                <p className="mt-2 text-sm font-semibold text-amber-700">{copy.statusText}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{copy.recoveryLabel}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-900">{copy.recoveryText}</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white/75 p-4 shadow-sm backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{copy.supportLabel}</p>
                <p className="mt-2 text-sm font-semibold text-zinc-900">{supportEmail}</p>
              </div>
            </div>

            {!hasReference ? (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">{copy.noReferenceTitle}</p>
                  <p className="mt-1 text-amber-800">{copy.noReferenceText}</p>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-200 bg-white/70 p-5 text-sm text-zinc-600 shadow-sm backdrop-blur">
              {copy.noteText}
            </div>
          </section>

          <aside className="relative rounded-3xl border border-zinc-200 bg-white/85 p-6 shadow-xl backdrop-blur sm:p-8">
            <div className="absolute -top-8 right-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>

            <div className="flex flex-col gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{copy.detailTitle}</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-900">
                  {hasPayment ? copy.summaryTitlePaid : copy.summaryTitleFallback}
                </h2>
              </div>

              {payment ? (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{copy.detailTitle}</span>
                    <Badge variant={statusBadge[payment.status ?? "neutral"] ?? "neutral"}>{payment.status ?? "--"}</Badge>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.companyLabel}</p>
                      <p className="mt-1 font-semibold text-zinc-900">{payment.companyName}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.planLabel}</p>
                      <p className="mt-1 font-semibold text-zinc-900">{payment.planName}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.monthsLabel}</p>
                        <p className="mt-1 font-semibold text-zinc-900">{payment.months_paid ?? 1}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.methodLabel}</p>
                        <p className="mt-1 font-semibold text-zinc-900">{payment.payment_method ?? "--"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.referenceLabel}</p>
                      <p className="mt-1 break-all font-mono text-xs text-zinc-700">{ref}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
                  {copy.noReferenceText}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-600 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.actionTitle}</p>
                  <p className="mt-2 font-medium text-zinc-900">{copy.actionText}</p>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-sm text-zinc-600 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.timingTitle}</p>
                  <p className="mt-2 font-medium text-zinc-900">{copy.timingText}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                <div>
                  <p className="font-semibold">{copy.protectedTitle}</p>
                  <p className="mt-1 text-sky-800">{copy.protectedText}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
