import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, AlertTriangle, ShieldAlert } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { CheckoutRetryLink } from "@/components/onboarding/payments/CheckoutRetryLink";
import { LandingLogo } from "@/components/ui/logo/landing-logo";
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

/** El correo se puede cortar después de la «@» y no a mitad de palabra («gmail.c / om») en una columna angosta. */
function breakableEmail(email: string): ReactNode {
  const at = email.indexOf("@");
  if (at < 0) return email;
  return (
    <>
      {email.slice(0, at + 1)}
      <wbr />
      {email.slice(at + 1)}
    </>
  );
}

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

  // Misma familia que /checkout/success: fondo blanco liso, cabecera con la marca y el detalle a la derecha.
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
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertTriangle className="h-6 w-6" aria-hidden />
            </span>
            <p className="mt-6 text-sm font-semibold text-amber-700">{copy.badge}</p>
            <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              {hasPayment ? copy.titlePaid : copy.titleFallback}
            </h1>
            <p className="mt-3 text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
              {hasPayment ? copy.leadPaid : copy.leadFallback}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={recoveryHref}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {hasPayment ? copy.accountButtonPaid : copy.accountButtonFallback}
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Link>
              <CheckoutRetryLink className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                {copy.retryButton}
              </CheckoutRetryLink>
            </div>

            {!hasReference ? (
              <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                <div>
                  <p className="font-semibold">{copy.noReferenceTitle}</p>
                  <p className="mt-1 text-amber-800">{copy.noReferenceText}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-12 border-t border-slate-200 pt-8">
              <dl className="grid gap-6 sm:grid-cols-3">
                <div>
                  <dt className="text-sm font-semibold text-slate-900">{copy.statusLabel}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-amber-700">{copy.statusText}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-slate-900">{copy.recoveryLabel}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600">{copy.recoveryText}</dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-slate-900">{copy.supportLabel}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600 [overflow-wrap:anywhere]">{breakableEmail(supportEmail)}</dd>
                </div>
              </dl>
              <p className="mt-6 text-sm leading-relaxed text-slate-500">{copy.noteText}</p>
            </div>
          </section>

          <aside className="min-w-0 lg:pt-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-20px_rgba(15,23,42,0.25)] sm:p-6">
              <p className="text-sm text-slate-500">{copy.detailTitle}</p>
              <div className="mt-1 flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">
                  {hasPayment ? copy.summaryTitlePaid : copy.summaryTitleFallback}
                </h2>
                {payment && statusText ? (
                  <Badge variant={statusBadge[payment.status.toLowerCase()] ?? "neutral"}>{statusText}</Badge>
                ) : null}
              </div>
              {payment ? (
                <dl className="mt-4 divide-y divide-slate-100 text-sm">
                  {payment.planName ? (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <dt className="text-slate-500">{copy.planLabel}</dt>
                      <dd className="text-right font-medium text-slate-900">{payment.planName}</dd>
                    </div>
                  ) : null}
                  {amountText ? (
                    <div className="flex items-start justify-between gap-4 py-3">
                      <dt className="text-slate-500">{copy.amountLabel}</dt>
                      <dd className="text-right font-medium text-slate-900">{amountText}</dd>
                    </div>
                  ) : null}
                  <div className="py-3">
                    <dt className="text-slate-500">{copy.referenceLabel}</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-slate-700">{payment.reference}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{copy.noReferenceText}</p>
              )}
            </div>

            <dl className="mt-6 space-y-4 px-1 text-sm">
              <div>
                <dt className="font-semibold text-slate-900">{copy.actionTitle}</dt>
                <dd className="mt-1 leading-relaxed text-slate-600">{copy.actionText}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">{copy.timingTitle}</dt>
                <dd className="mt-1 leading-relaxed text-slate-600">{copy.timingText}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-900">{copy.protectedTitle}</dt>
                <dd className="mt-1 leading-relaxed text-slate-600">{copy.protectedText}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
    </div>
  );
}
