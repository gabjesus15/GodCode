"use client";

import { AlertTriangle, CalendarClock, Check, ChevronRight, Clock, Minus, Package, Plus, RotateCcw } from "lucide-react";

import { classifyPortalPaymentReference, isOrderAwaitingPayment } from "@/lib/billing/portal-orders";
import { RENEWAL_MONTH_OPTIONS, type SubscriptionPhase } from "@/lib/billing/portal-pricing";
import { isSingleInstanceAddon, resolveAddonUnitPrice } from "@/lib/plans/addon-pricing";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";
import type { AddonPurchase, SubscriptionBilling } from "../../hooks/use-subscription-billing";
import { fmtDay, fmtUsd, paymentStatusLabel } from "../../shared/customer-account-format";
import type {
  ActiveAddon,
  AddonOption,
  CompanySnapshot,
  PaymentSummary,
  PlanOption,
  ScheduledPlanChange,
} from "../../shared/customer-account-types";
import { Alert } from "../../ui/Alert";
import { Badge, paymentStatusVariant } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import type { ColorVariant } from "../../ui/tokens";
import { Dialog, DialogFooter } from "../../ui/Dialog";
import { EmptyState } from "../../ui/EmptyState";
import { PageHeader } from "../../ui/PageHeader";

export type AccountPlanTabProps = {
  company: CompanySnapshot;
  subscriptionEndsAt: string | null;
  scheduledPlanChange: ScheduledPlanChange | null;
  availablePlans: PlanOption[];
  availableAddons: AddonOption[];
  activeAddonRows: ActiveAddon[];
  openOrders: PaymentSummary[];
  describeOrder: (order: PaymentSummary) => string;
  billing: SubscriptionBilling;
  addonPurchase: AddonPurchase;
  onPayOrder: (order: PaymentSummary) => void;
};

/** 999 o más (o sin límite) se muestra como ilimitado: es como se cargan en el panel. */
function formatLimit(value: number | null | undefined, singular: string, plural: string, unlimited: string): string {
  if (value == null || value >= 999) return unlimited;
  return `${value} ${value === 1 ? singular : plural}`;
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / 86_400_000);
}

const PHASE_BADGE: Record<SubscriptionPhase, { label: string; variant: ColorVariant }> = {
  active: { label: "Activa", variant: "success" },
  trial: { label: "Prueba gratis", variant: "info" },
  cancelling: { label: "Cancelada", variant: "warning" },
  expired: { label: "Vencida", variant: "danger" },
  payment_pending: { label: "Validando pago", variant: "warning" },
  open_ended: { label: "Activa", variant: "success" },
};

// ─── Tarjeta de la suscripción ────────────────────────────────────────────────

function SubscriptionCard({
  company,
  subscriptionEndsAt,
  scheduledPlanChange,
  billing,
}: Pick<AccountPlanTabProps, "company" | "subscriptionEndsAt" | "scheduledPlanChange" | "billing">) {
  const { phase } = billing;
  const days = daysUntil(subscriptionEndsAt);
  const endDate = fmtDay(subscriptionEndsAt, company.timezone);
  const badge = PHASE_BADGE[phase];
  const canRenew = phase === "active" || phase === "trial" || phase === "cancelling" || phase === "expired";
  const canChangePlan = phase !== "payment_pending" && phase !== "open_ended";

  const statusLine: Record<SubscriptionPhase, string> = {
    active: `Pagada hasta el ${endDate}${days != null ? ` · ${days === 1 ? "queda 1 día" : `quedan ${days} días`}` : ""}`,
    trial: `Prueba gratis hasta el ${endDate}${days != null ? ` · ${days === 1 ? "queda 1 día" : `quedan ${days} días`}` : ""}`,
    cancelling: `Sigue online hasta el ${endDate}`,
    expired: subscriptionEndsAt ? `Venció el ${endDate}` : "Sin periodo pagado",
    payment_pending: "Estamos validando tu primer pago",
    open_ended: "Sin fecha de vencimiento",
  };

  return (
    <Card>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Tu plan</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold tracking-tight text-[#1d1d1f]">{company.planName ?? "Sin plan"}</h3>
            <Badge variant={badge.variant} dot>{badge.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-[#6e6e73]">
            {company.planPrice != null && company.planPrice > 0 ? `${fmtUsd(company.planPrice, company.locale)} al mes` : "Sin costo"}
          </p>
          <p className={`mt-3 flex items-center gap-1.5 text-sm ${phase === "expired" ? "font-medium text-red-600" : "text-[#1d1d1f]"}`}>
            <CalendarClock className="h-4 w-4 shrink-0 text-[#a1a1a6]" aria-hidden />
            {statusLine[phase]}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {canRenew && (
            <Button className="justify-center" icon={<RotateCcw className="h-4 w-4" />} onClick={() => billing.renew.openRenew()}>
              {phase === "expired" ? "Renovar ahora" : phase === "trial" ? "Pagar mi plan" : "Renovar"}
            </Button>
          )}
          {canChangePlan && (
            <Button variant="secondary" className="justify-center" onClick={() => billing.planChange.openPlanChange()}>
              Cambiar plan
            </Button>
          )}
        </div>
      </div>

      {phase === "expired" && (
        <Alert variant="danger" className="mt-5" title="Tu tienda está fuera de línea">
          Renueva para volver a estar en línea: los meses pagados cuentan desde hoy. Si quieres, elige otro plan al renovar.
        </Alert>
      )}
      {phase === "trial" && days != null && days <= 7 && (
        <Alert variant="warning" className="mt-5" title="Tu prueba termina pronto">
          Paga tu plan antes del {endDate} para que tu tienda siga en línea sin cortes.
        </Alert>
      )}
      {phase === "active" && days != null && days <= 7 && (
        <Alert variant="warning" className="mt-5" title="Tu plan vence pronto">
          Renueva antes del {endDate}: los meses nuevos se suman desde esa fecha, no pierdes días.
        </Alert>
      )}
      {phase === "cancelling" && (
        <Alert
          variant="warning"
          className="mt-5"
          title="Cancelaste tu suscripción"
          action={
            <Button variant="secondary" size="sm" loading={billing.reactivation.busy} onClick={() => void billing.reactivation.reactivate()}>
              Reactivar gratis
            </Button>
          }
        >
          Tu tienda sigue online hasta el {endDate} y después se suspende. Puedes reactivarla gratis antes de esa fecha.
        </Alert>
      )}
      {phase === "open_ended" && (
        <Alert variant="neutral" className="mt-5" title="Plan administrado por nuestro equipo">
          Tu cuenta no tiene fecha de vencimiento. Para cambiar de plan o sumar extras mensuales, escríbenos por Soporte.
        </Alert>
      )}
      {phase === "payment_pending" && (
        <Alert variant="info" className="mt-5" title="Estamos validando tu primer pago">
          Te avisamos por correo en cuanto quede activo. Si ya pasó más de un día hábil, escríbenos a {company.supportEmail}.
        </Alert>
      )}
      {scheduledPlanChange && (
        <Alert
          variant="info"
          className="mt-5"
          title={`Pasarás al plan ${scheduledPlanChange.targetPlanName ?? "nuevo"} el ${fmtDay(scheduledPlanChange.effectiveAt, company.timezone)}`}
          action={
            <Button variant="secondary" size="sm" loading={billing.schedule.busy} onClick={() => void billing.schedule.cancel()}>
              Anular el cambio
            </Button>
          }
        >
          Hasta entonces sigues con {company.planName ?? "tu plan actual"}. Tus renovaciones ya usan el precio del plan nuevo.
        </Alert>
      )}

      {phase === "active" && (
        <div className="mt-6 border-t border-[#f5f5f7] pt-4">
          <button
            type="button"
            onClick={billing.cancellation.openCancel}
            className="text-sm font-medium text-[#6e6e73] underline-offset-4 transition hover:text-red-600 hover:underline"
          >
            Cancelar suscripción
          </button>
        </div>
      )}
    </Card>
  );
}

// ─── Pagos pendientes ─────────────────────────────────────────────────────────

function PendingOrdersCard({
  company,
  openOrders,
  describeOrder,
  onPayOrder,
}: Pick<AccountPlanTabProps, "company" | "openOrders" | "describeOrder" | "onPayOrder">) {
  if (openOrders.length === 0) return null;
  return (
    <Card compact noPadding>
      <div className="flex items-center justify-between gap-3 px-4 pt-4 sm:px-5">
        <p className="text-sm font-semibold text-[#1d1d1f]">Pagos pendientes</p>
        <Badge variant="warning">{openOrders.length}</Badge>
      </div>
      <ul className="mt-2 divide-y divide-[#f5f5f7]">
        {openOrders.map((order) => {
          const awaiting = isOrderAwaitingPayment(order);
          return (
            <li key={order.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1d1d1f]">{describeOrder(order)}</p>
                <p className="mt-0.5 text-xs text-[#6e6e73]">
                  {order.status === "rejected"
                    ? "Rechazamos el comprobante: envía otro o paga con PayPal."
                    : awaiting
                      ? `Creado el ${fmtDay(order.payment_date, company.timezone)}`
                      : "Revisando tu comprobante"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <span className="text-sm font-semibold tabular-nums text-[#1d1d1f]">{fmtUsd(order.amount_paid, company.locale)}</span>
                <Badge variant={paymentStatusVariant(order.status)}>{paymentStatusLabel(order.status)}</Badge>
                <Button size="sm" variant={awaiting ? "primary" : "secondary"} onClick={() => onPayOrder(order)}>
                  {awaiting ? "Pagar" : "Ver"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ─── Renovar ──────────────────────────────────────────────────────────────────

function RenewDialog({ company, availablePlans, billing }: Pick<AccountPlanTabProps, "company" | "availablePlans" | "billing">) {
  const { renew, phase } = billing;
  const quote = renew.quote;
  const choosePlan = phase === "expired";
  const planOptions = [
    ...(company.planId && !availablePlans.some((p) => p.id === company.planId) && (company.planPrice ?? 0) > 0
      ? [{ id: company.planId, name: company.planName ?? "Plan actual", price: company.planPrice }]
      : []),
    ...availablePlans.filter((p) => (p.price ?? 0) > 0),
  ];

  return (
    <Dialog
      open={renew.open}
      onOpenChange={renew.setOpen}
      title={phase === "trial" ? "Pagar mi plan" : "Renovar suscripción"}
      description="Suma meses a tu plan. Los extras mensuales se renuevan junto con él."
      size="lg"
    >
      <div className="space-y-4">
        {choosePlan && (
          <div>
            <label htmlFor="renew-plan" className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Plan</label>
            <select
              id="renew-plan"
              value={renew.planId || quote?.plan.id || ""}
              onChange={(e) => renew.setPlanId(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              {!renew.planId && !quote && <option value="">Elige un plan</option>}
              {planOptions.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} · {fmtUsd(plan.price, company.locale)}/mes{plan.id === company.planId ? " (tu plan)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <p className="mb-1.5 text-xs font-medium text-[#6e6e73]">¿Cuántos meses?</p>
          <div role="radiogroup" aria-label="Meses a pagar" className="grid grid-cols-4 gap-2">
            {RENEWAL_MONTH_OPTIONS.map((months) => {
              const active = renew.months === months;
              return (
                <button
                  key={months}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => renew.setMonths(months)}
                  className={`h-11 rounded-xl border text-sm font-medium transition ${
                    active ? "border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500" : "border-[#e5e5ea] text-[#1d1d1f] hover:bg-[#fbfbfd]"
                  }`}
                >
                  {months} {months === 1 ? "mes" : "meses"}
                </button>
              );
            })}
          </div>
        </div>

        {renew.loading && !quote ? (
          <div className="h-40 animate-pulse rounded-xl bg-[#f5f5f7]" />
        ) : quote ? (
          <div className={`rounded-xl border border-[#e5e5ea] transition-opacity ${renew.loading ? "opacity-50" : ""}`} aria-busy={renew.loading}>
            <ul className="divide-y divide-[#f5f5f7] text-sm">
              {quote.quote.lines.map((line) => (
                <li key={line.key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="min-w-0 text-[#1d1d1f]">
                    {line.label}
                    {line.quantity > 1 && <span className="text-[#6e6e73]"> × {line.quantity}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-[#6e6e73]">{fmtUsd(line.monthly, company.locale)}/mes</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 border-t border-[#e5e5ea] bg-[#fbfbfd] px-4 py-3 text-sm">
              <div className="flex justify-between text-[#6e6e73]">
                <span>{fmtUsd(quote.quote.monthlyTotal, company.locale)} × {quote.quote.months} {quote.quote.months === 1 ? "mes" : "meses"}</span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-[#1d1d1f]">Total a pagar</span>
                <span className="text-xl font-semibold tabular-nums text-[#1d1d1f]">{fmtUsd(quote.quote.amount, company.locale)}</span>
              </div>
              <p className="pt-1 text-xs text-[#6e6e73]">
                Quedará pagado hasta el <strong className="text-[#1d1d1f]">{fmtDay(quote.quote.newEndsAt, company.timezone)}</strong>
                {phase === "expired" ? " (los meses cuentan desde hoy)." : "."}
              </p>
            </div>
          </div>
        ) : null}

        {quote?.openOrderId && (
          <Alert
            variant="warning"
            title="Ya tienes un pago pendiente de tu plan"
            action={
              <Button size="sm" variant="secondary" onClick={() => { renew.setOpen(false); billing.onOpenOrder(quote.openOrderId as string); }}>
                Ver pago pendiente
              </Button>
            }
          >
            Págalo o anúlalo antes de crear otro.
          </Alert>
        )}
        {renew.error && <Alert variant="danger">{renew.error}</Alert>}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => renew.setOpen(false)}>Cancelar</Button>
        <Button
          loading={renew.busy}
          disabled={renew.loading || !quote || Boolean(quote.openOrderId)}
          onClick={() => void renew.submit()}
        >
          Continuar al pago
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ─── Cambiar de plan ──────────────────────────────────────────────────────────

function PlanChangeDialog({ company, availablePlans, billing }: Pick<AccountPlanTabProps, "company" | "availablePlans" | "billing">) {
  const { planChange } = billing;
  const preview = planChange.preview;
  const quote = preview?.quote;
  const blocks = preview?.impacts.filter((impact) => impact.level === "block") ?? [];
  const infos = preview?.impacts.filter((impact) => impact.level === "info") ?? [];
  const expiredBlock = quote?.mode === "blocked" && quote.reason === "expired";
  const plans = [...availablePlans].sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));

  const actionLabel =
    quote?.mode === "upgrade" ? "Continuar al pago" : quote?.mode === "downgrade" ? "Programar cambio" : "Cambiar ahora";

  return (
    <Dialog open={planChange.open} onOpenChange={planChange.setOpen} title="Cambiar de plan" description="Elige el plan que mejor le queda a tu negocio." size="xl">
      <div className="space-y-4">
        <div role="radiogroup" aria-label="Planes" className="grid gap-2 sm:grid-cols-2">
          {plans.map((plan) => {
            const current = plan.id === company.planId;
            const active = plan.id === planChange.targetPlanId;
            return (
              <button
                key={plan.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={current}
                onClick={() => planChange.setTargetPlanId(plan.id)}
                className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${
                  active
                    ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500"
                    : current
                      ? "border-[#e5e5ea] bg-[#fbfbfd]"
                      : "border-[#e5e5ea] hover:bg-[#fbfbfd]"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-[#1d1d1f]">{plan.name}</span>
                  {current ? <Badge variant="neutral">Tu plan</Badge> : active ? <Check className="h-4 w-4 text-indigo-600" aria-hidden /> : null}
                </span>
                <span className="text-sm tabular-nums text-[#1d1d1f]">{fmtUsd(plan.price, company.locale)}<span className="text-[#6e6e73]">/mes</span></span>
                <span className="text-xs text-[#6e6e73]">
                  {formatLimit(plan.max_branches, "sucursal", "sucursales", "Sucursales ilimitadas")} ·{" "}
                  {formatLimit(plan.max_users, "usuario", "usuarios", "usuarios ilimitados")}
                </span>
              </button>
            );
          })}
        </div>

        {!planChange.targetPlanId ? (
          <p className="rounded-xl bg-[#fbfbfd] px-4 py-3 text-sm text-[#6e6e73]">Elige un plan para ver cuánto cuesta el cambio.</p>
        ) : planChange.loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-[#f5f5f7]" />
        ) : preview && quote ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-[#fbfbfd] px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="text-xs text-[#6e6e73]">Ahora</p>
                <p className="truncate font-medium text-[#1d1d1f]">{preview.currentPlan?.name ?? company.planName ?? "-"}</p>
                <p className="text-xs tabular-nums text-[#6e6e73]">{fmtUsd(preview.currentPlan?.monthly ?? company.planPrice, company.locale)}/mes</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[#d2d2d7]" aria-hidden />
              <div className="min-w-0">
                <p className="text-xs text-[#6e6e73]">Nuevo</p>
                <p className="truncate font-medium text-[#1d1d1f]">{preview.targetPlan.name}</p>
                <p className="text-xs tabular-nums text-[#6e6e73]">{fmtUsd(preview.targetPlan.monthly, company.locale)}/mes</p>
              </div>
            </div>

            {quote.mode === "upgrade" && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-[#1d1d1f]">Hoy pagas</span>
                  <span className="text-xl font-semibold tabular-nums text-[#1d1d1f]">{fmtUsd(quote.amount, company.locale)}</span>
                </div>
                <p className="mt-1 text-xs text-[#6e6e73]">
                  La diferencia ({fmtUsd(quote.monthlyDiff, company.locale)}/mes) por los {quote.remainingDays} días que quedan de tu
                  periodo. Tu vencimiento no cambia; desde la próxima renovación pagas {fmtUsd(preview.targetPlan.monthly, company.locale)}/mes.
                </p>
              </div>
            )}
            {quote.mode === "switch" && (
              <Alert variant="success">
                {billing.phase === "trial" ? "Estás en prueba: el cambio es inmediato y sin cobro." : "Mismo precio: el cambio es inmediato y sin cobro."}
              </Alert>
            )}

            {blocks.map((impact) => (
              <Alert key={impact.id} variant={expiredBlock && impact.id === "phase-expired" ? "warning" : "danger"} title={impact.title}>
                {impact.detail}
              </Alert>
            ))}
            {infos.length > 0 && (
              <ul className="space-y-2">
                {infos.map((impact) => (
                  <li key={impact.id} className="flex items-start gap-2.5 rounded-xl border border-[#e5e5ea] px-3.5 py-2.5 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" aria-hidden />
                    <span className="min-w-0">
                      <span className="block font-medium text-[#1d1d1f]">{impact.title}</span>
                      <span className="block text-xs text-[#6e6e73]">{impact.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {planChange.error && <Alert variant="danger">{planChange.error}</Alert>}
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={() => planChange.setOpen(false)}>Cancelar</Button>
        {expiredBlock && preview ? (
          <Button onClick={() => planChange.renewWithPlan(preview.targetPlan.id)}>Renovar con este plan</Button>
        ) : preview?.openOrderId ? (
          <Button variant="secondary" onClick={() => { planChange.setOpen(false); billing.onOpenOrder(preview.openOrderId as string); }}>
            Ver pago pendiente
          </Button>
        ) : (
          <Button
            loading={planChange.busy}
            disabled={!preview || planChange.loading || blocks.length > 0}
            onClick={() => void planChange.submit()}
          >
            {actionLabel}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}

// ─── Extras ───────────────────────────────────────────────────────────────────

function AddonDialog({ company, addonPurchase }: Pick<AccountPlanTabProps, "company" | "addonPurchase">) {
  const { preview } = addonPurchase;
  const blocks = preview?.impacts.filter((impact) => impact.level === "block") ?? [];
  const canChooseQuantity = preview != null && !preview.addon.isMonthly && !preview.addon.singleInstance;
  const free = preview != null && !(preview.pricing.amount > 0);

  return (
    <Dialog
      open={addonPurchase.open}
      onOpenChange={addonPurchase.setOpen}
      title={preview ? `Contratar ${preview.addon.name}` : "Contratar extra"}
      description={preview?.addon.description ?? undefined}
      size="md"
    >
      {addonPurchase.loading && !preview ? (
        <div className="h-32 animate-pulse rounded-xl bg-[#f5f5f7]" />
      ) : preview ? (
        <div className="space-y-4">
          {canChooseQuantity && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-[#1d1d1f]">Cantidad</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="Menos"
                  disabled={addonPurchase.quantity <= 1}
                  onClick={() => addonPurchase.setQuantity(Math.max(1, addonPurchase.quantity - 1))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-6 text-center text-sm font-semibold tabular-nums">{addonPurchase.quantity}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  aria-label="Más"
                  disabled={addonPurchase.quantity >= 10}
                  onClick={() => addonPurchase.setQuantity(Math.min(10, addonPurchase.quantity + 1))}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className={`rounded-xl bg-[#fbfbfd] px-4 py-3 text-sm transition-opacity ${addonPurchase.loading ? "opacity-50" : ""}`} aria-busy={addonPurchase.loading}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-[#1d1d1f]">{free ? "Sin costo" : "Hoy pagas"}</span>
              {!free && (
                <span className="text-xl font-semibold tabular-nums text-[#1d1d1f]">{fmtUsd(preview.pricing.amount, company.locale)}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#6e6e73]">
              {preview.addon.isMonthly
                ? preview.pricing.coversUntil
                  ? `${fmtUsd(preview.addon.unitPrice, company.locale)}/mes. Hoy pagas los ${preview.pricing.remainingDays} días hasta tu vencimiento (${fmtDay(preview.pricing.coversUntil, company.timezone)}); después se suma a cada renovación.`
                  : `${fmtUsd(preview.addon.unitPrice, company.locale)}/mes, junto con tu plan.`
                : `Pago único${preview.quantity > 1 ? ` por ${preview.quantity} unidades` : ""}.`}
            </p>
          </div>

          {blocks.map((impact) => (
            <Alert key={impact.id} variant="warning" title={impact.title}>{impact.detail}</Alert>
          ))}
          {addonPurchase.error && <Alert variant="danger">{addonPurchase.error}</Alert>}
        </div>
      ) : addonPurchase.error ? (
        <Alert variant="danger">{addonPurchase.error}</Alert>
      ) : null}

      <DialogFooter>
        <Button variant="secondary" onClick={() => addonPurchase.setOpen(false)}>Cancelar</Button>
        <Button
          loading={addonPurchase.busy}
          disabled={!preview || addonPurchase.loading || addonPurchase.blocked}
          onClick={() => void addonPurchase.submit()}
        >
          {free ? "Activar" : "Continuar al pago"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

function ExtrasCatalog({
  company,
  availablePlans,
  availableAddons,
  activeAddonRows,
  openOrders,
  addonPurchase,
  billing,
}: Pick<AccountPlanTabProps, "company" | "availablePlans" | "availableAddons" | "activeAddonRows" | "openOrders" | "addonPurchase" | "billing">) {
  const currentPlan = availablePlans.find((plan) => plan.id === company.planId) ?? null;
  const ownedIds = new Set(
    activeAddonRows.filter((row) => String(row.status ?? "").toLowerCase() === "active").map((row) => row.addonId),
  );
  const pendingAddonIds = new Set(
    openOrders
      .map((order) => classifyPortalPaymentReference(order.payment_reference)?.addonId)
      .filter((id): id is string => Boolean(id)),
  );
  const canBuy = billing.phase !== "expired" && billing.phase !== "payment_pending";

  return (
    <div>
      <PageHeader title="Extras" description="Servicios que puedes sumar a tu plan. Los mensuales vencen y se renuevan junto con él." />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {availableAddons.length === 0 ? (
          <EmptyState icon={Package} title="Sin extras disponibles" description="Por ahora no hay servicios adicionales para tu plan." className="col-span-full" />
        ) : (
          availableAddons.map((addon) => {
            const { isMonthly, unitPrice } = resolveAddonUnitPrice(addon);
            const owned = ownedIds.has(addon.id);
            const pending = pendingAddonIds.has(addon.id.toLowerCase());
            const included = currentPlan
              ? resolveAddonOfferForPlan(currentPlan, { id: addon.id, slug: addon.slug ?? null, name: addon.name, type: addon.type, description: addon.description }).status === "included"
              : false;
            const repeatable = !isMonthly && !isSingleInstanceAddon(addon);
            return (
              <Card key={addon.id} compact className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-semibold text-[#1d1d1f]">{addon.name}</p>
                  {owned ? (
                    <Badge variant="success" dot>Activo</Badge>
                  ) : included ? (
                    <Badge variant="info">Incluido</Badge>
                  ) : pending ? (
                    <Badge variant="warning">Pago pendiente</Badge>
                  ) : null}
                </div>
                {addon.description && <p className="-mt-1 text-xs leading-relaxed text-[#6e6e73]">{addon.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#f5f5f7] pt-3">
                  <p className="text-sm font-semibold tabular-nums text-[#1d1d1f]">
                    {unitPrice > 0 ? (
                      <>
                        {fmtUsd(unitPrice, company.locale)}
                        <span className="font-normal text-[#6e6e73]">{isMonthly ? "/mes" : " pago único"}</span>
                      </>
                    ) : (
                      "Gratis"
                    )}
                  </p>
                  {included ? (
                    <span className="text-xs text-[#6e6e73]">Viene con tu plan</span>
                  ) : owned && !repeatable ? (
                    <span className="flex items-center gap-1 text-xs text-[#6e6e73]">
                      {isMonthly ? <><Clock className="h-3.5 w-3.5" aria-hidden /> Se renueva con tu plan</> : "Contratado"}
                    </span>
                  ) : pending ? (
                    <span className="text-xs text-[#6e6e73]">En «Pagos pendientes»</span>
                  ) : isMonthly && billing.phase === "open_ended" ? (
                    <span className="text-xs text-[#6e6e73]">Pídelo por Soporte</span>
                  ) : (
                    <Button size="sm" variant={owned ? "secondary" : "primary"} disabled={!canBuy} onClick={() => addonPurchase.openAddon(addon.id)}>
                      {owned ? "Comprar más" : "Contratar"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Cancelar suscripción ─────────────────────────────────────────────────────

function CancelSubscriptionDialog({ company, subscriptionEndsAt, billing }: Pick<AccountPlanTabProps, "company" | "subscriptionEndsAt" | "billing">) {
  const { cancellation } = billing;
  return (
    <Dialog open={cancellation.open} onOpenChange={cancellation.setOpen} title="Cancelar suscripción" size="md">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-[#6e6e73]">
          Tu tienda y tu panel siguen funcionando hasta el{" "}
          <strong className="text-[#1d1d1f]">{fmtDay(subscriptionEndsAt, company.timezone)}</strong>; después se suspenden. Puedes
          reactivarla gratis antes de esa fecha.
        </p>
        <div>
          <label htmlFor="cancel-reason" className="mb-1.5 block text-xs font-medium text-[#6e6e73]">¿Por qué te vas? (opcional)</label>
          <textarea
            id="cancel-reason"
            value={cancellation.reason}
            onChange={(e) => cancellation.setReason(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Nos ayuda a mejorar."
            className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <label className="flex items-start gap-2.5 text-sm text-[#1d1d1f]">
          <input
            type="checkbox"
            checked={cancellation.ack}
            onChange={(e) => cancellation.setAck(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-red-600"
          />
          Entiendo que lo ya pagado no se reembolsa.
        </label>
        {cancellation.error && <Alert variant="danger">{cancellation.error}</Alert>}
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={() => cancellation.setOpen(false)}>Volver</Button>
        <Button variant="danger" loading={cancellation.busy} disabled={!cancellation.ack} onClick={() => void cancellation.submit()}>
          Cancelar suscripción
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ─── Pestaña ──────────────────────────────────────────────────────────────────

export function AccountPlanTab(props: AccountPlanTabProps) {
  const { billing } = props;
  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Plan y extras" description="Tu suscripción, renovaciones y servicios adicionales. Todos los montos son en dólares (USD)." />

      {billing.feedback && (
        <Alert variant={billing.feedback.tone} onDismiss={() => billing.setFeedback(null)}>
          {billing.feedback.message}
        </Alert>
      )}

      <SubscriptionCard {...props} />
      <PendingOrdersCard {...props} />
      <ExtrasCatalog {...props} />

      <RenewDialog {...props} />
      <PlanChangeDialog {...props} />
      <AddonDialog {...props} />
      <CancelSubscriptionDialog {...props} />
    </div>
  );
}
