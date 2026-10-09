import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, AlertTriangle, Clock3, ExternalLink, ShieldAlert } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { CheckoutRetryLink } from "@/components/onboarding/payments/CheckoutRetryLink";
import { formatUsd } from "@/lib/billing/portal-pricing";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { LANDING_SUPPORT_EMAIL } from "@/lib/landing/brand";
import { checkoutStatusLabel, getCheckoutCopy, isCheckoutPaidStatus } from "@/lib/plans/checkout-copy";
import { resolvePlanName } from "@/lib/plans/plan-i18n";
import { getCurrentLocale } from "../../../lib/i18n/server";

/** @service-role capability-token
 *
 * Solo lectura por `payment_reference` (la referencia que trae la URL, la conoce quien
 * pagó): estado, plan y monto. Antes se leía con la sesión anónima, la RLS lo impedía y la
 * página siempre decía «intento no encontrado»; además pedía el token del alta para el botón
 * de reintentar. Ese token ya no sale del servidor (el botón lo toma de la pestaña).
 * Una referencia que no existe, con otra forma o que no se pudo leer da la misma página.
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

/** Formato del monto (siempre en dólares) según el idioma del visitante. */
const AMOUNT_LOCALES: Record<string, string> = { es: "es-CL", en: "en-US", pt: "pt-BR", fr: "fr-FR", de: "de-DE", it: "it-IT" };

type CancelledPayment = {
  reference: string;
  status: string;
  planName: string | null;
  amountUsd: number | null;
  /** Ya tiene negocio en Gcode: el botón lleva a su cuenta en vez del login. */
  hasAccount: boolean;
};

type PaymentRow = { status: unknown; planId: unknown; amount: unknown; companyId: unknown };

function isSafeReference(ref: string | undefined): ref is string {
  return Boolean(ref && ref.length <= 100 && /^[A-Za-z0-9_-]+$/.test(ref));
}

/** Pagos del portal y del alta ya cerrada; si no está, la solicitud de alta con esa referencia. */
async function readPaymentRow(ref: string): Promise<PaymentRow | null> {
  const { data: payment } = await supabaseAdmin
    .from("payments_history")
    .select("status,plan_id,amount_paid,company_id")
    .eq("payment_reference", ref)
    .maybeSingle();
  if (payment) {
    return { status: payment.status, planId: payment.plan_id, amount: payment.amount_paid, companyId: payment.company_id };
  }
  const { data: application } = await supabaseAdmin
    .from("onboarding_applications")
    .select("payment_status,plan_id,payment_amount,company_id")
    .eq("payment_reference", ref)
    .maybeSingle();
  if (!application) return null;
  return {
    status: application.payment_status ?? "pending",
    planId: application.plan_id,
    amount: application.payment_amount,
    companyId: application.company_id,
  };
}

async function findCancelledPayment(ref: string | undefined, locale: string): Promise<CancelledPayment | null> {
  if (!isSafeReference(ref)) return null;
  try {
    const row = await readPaymentRow(ref);
    if (!row) return null;
    const planId = String(row.planId ?? "").trim();
    const { data: plan } = planId
      ? await supabaseAdmin.from("plans").select("name,name_i18n").eq("id", planId).maybeSingle()
      : { data: null };
    const amount = Number(row.amount);
    return {
      reference: ref,
      status: String(row.status ?? "pending"),
      planName: plan ? resolvePlanName({ locale, name: plan.name, nameI18n: plan.name_i18n }) : null,
      amountUsd: Number.isFinite(amount) && amount > 0 ? amount : null,
      hasAccount: Boolean(row.companyId),
    };
  } catch (error) {
    // Para quien mira es lo mismo que una referencia desconocida; el detalle queda en el log.
    console.error("[checkout/cancel] no se pudo leer el pago:", error);
    return null;
  }
}

export default async function CheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const locale = await getCurrentLocale();
  const checkout = getCheckoutCopy(locale);
  const copy = checkout.cancel;
  const resolvedParams = await searchParams;
  const ref = Array.isArray(resolvedParams.ref)
    ? resolvedParams.ref[0]
    : resolvedParams.ref;
  const payment = await findCancelledPayment(ref, locale);
  // Ya está cobrado: decir aquí que no se completó sería falso; la página de éxito lo cuenta bien.
  if (payment && isCheckoutPaidStatus(payment.status)) {
    redirect(`/checkout/success?ref=${encodeURIComponent(payment.reference)}`);
  }
  const supportEmail = LANDING_SUPPORT_EMAIL;
  const recoveryHref = payment?.hasAccount ? "/cuenta" : "/login";
  const hasReference = Boolean(ref);
  const hasPayment = Boolean(payment);
  // El estado en palabras del idioma del visitante; un código desconocido no se muestra.
  const statusText = payment ? checkoutStatusLabel(payment.status, checkout.status) : null;
  const amountText = payment?.amountUsd ? formatUsd(payment.amountUsd, AMOUNT_LOCALES[locale] ?? "es-CL") : null;

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
              <CheckoutRetryLink className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50">
                {copy.retryButton}
              </CheckoutRetryLink>
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
                    {statusText ? <Badge variant={statusBadge[payment.status.toLowerCase()] ?? "neutral"}>{statusText}</Badge> : null}
                  </div>
                  <div className="mt-4 grid gap-3">
                    {payment.planName || amountText ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {payment.planName ? (
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.planLabel}</p>
                            <p className="mt-1 font-semibold text-zinc-900">{payment.planName}</p>
                          </div>
                        ) : null}
                        {amountText ? (
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.amountLabel}</p>
                            <p className="mt-1 font-semibold text-zinc-900">{amountText}</p>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <div>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{copy.referenceLabel}</p>
                      <p className="mt-1 break-all font-mono text-xs text-zinc-700">{payment.reference}</p>
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
