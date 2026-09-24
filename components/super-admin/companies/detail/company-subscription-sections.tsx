"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SaasSelect } from "@/components/super-admin/shared/saas-select";
import { SaasStatusBadge } from "@/components/super-admin/shared/saas-status-badge";
import { useAdminRole } from "@/components/super-admin/shell/admin-role-context";
import { classifyPortalPaymentReference, describePortalOrder } from "@/lib/billing/portal-orders";
import { extendSubscriptionEnd, formatUsd, roundUsd } from "@/lib/billing/portal-pricing";
import { formatAdminDay } from "@/lib/super-admin/admin-format";
import { SUBSCRIPTION_STATUS_OPTIONS } from "@/lib/super-admin/form-options";
import { paymentStatus } from "@/lib/super-admin/status-maps";
import { Field, SectionCard, SectionSaveBar, useCompanySection } from "./company-section";
import type { CompanyDetail, CompanyPayment, CompanyPlanOption, CompanyScheduledChange } from "./company-detail-types";

const formatDay = (iso: string | null | undefined) => formatAdminDay(iso);

const STATUS_HELP: Record<string, string> = {
  active: "Tienda y panel funcionando.",
  trial: "Prueba gratis hasta la fecha de vencimiento.",
  payment_pending: "Alta creada, esperando que validemos el primer pago.",
  cancelled: "El dueño canceló: sigue online hasta el vencimiento y después se suspende.",
  suspended: "Tienda fuera de línea y panel bloqueado.",
};

export function CompanyPlanSection({
  company,
  plans,
  scheduledChange,
}: {
  company: CompanyDetail;
  plans: CompanyPlanOption[];
  scheduledChange: CompanyScheduledChange;
}) {
  const { readOnly } = useAdminRole();
  const section = useCompanySection({
    plan_id: company.plan_id ?? "",
    subscription_status: company.subscription_status ?? "active",
  });
  const v = section.values;
  const planOptions = [
    { value: "", label: "Sin plan" },
    ...plans.map((plan) => ({
      value: plan.id,
      label: `${plan.name ?? "Plan"} · ${formatUsd(plan.price)}/mes${plan.is_public === false ? " (interno)" : ""}${plan.is_active === false ? " (inactivo)" : ""}`,
    })),
  ];
  const planChanged = v.plan_id !== (company.plan_id ?? "");

  return (
    <SectionCard
      title="Plan y estado"
      description="Corrige a mano el plan o el estado. No genera cobros: para cobrar, el dueño paga desde /cuenta."
      footer={<SectionSaveBar {...section} onSave={() => void section.save((current) => ({ company: current }))} onReset={section.reset} />}
    >
      <fieldset disabled={readOnly || section.saving} className="grid gap-4 md:grid-cols-2">
        <div>
          <SaasSelect label="Plan" value={v.plan_id} onChange={(value) => section.set("plan_id", value)} options={planOptions} />
          {planChanged ? (
            <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-300">
              Cambia al instante y actualiza las secciones del panel del negocio.
              {scheduledChange ? " Anula el cambio que el dueño tenía programado." : ""}
            </p>
          ) : null}
        </div>
        <div>
          <SaasSelect
            label="Estado"
            value={v.subscription_status}
            onChange={(value) => section.set("subscription_status", value)}
            options={SUBSCRIPTION_STATUS_OPTIONS}
          />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{STATUS_HELP[v.subscription_status] ?? ""}</p>
        </div>
      </fieldset>
      {scheduledChange ? (
        <p className="mt-4 rounded-xl bg-zinc-50 px-3 py-2 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
          El dueño programó pasar al plan <strong>{scheduledChange.targetPlanName ?? "nuevo"}</strong> el{" "}
          {formatDay(scheduledChange.effectiveAt)}.
        </p>
      ) : null}
    </SectionCard>
  );
}

export function CompanyExtendSection({ company, plans }: { company: CompanyDetail; plans: CompanyPlanOption[] }) {
  const { readOnly } = useAdminRole();
  const router = useRouter();
  const plan = plans.find((item) => item.id === company.plan_id) ?? null;
  const isDevPlan = String(plan?.name ?? "").toLowerCase().includes("dev");
  const [months, setMonths] = useState(1);
  const [registerPayment, setRegisterPayment] = useState(true);
  const [amount, setAmount] = useState<string>(String(roundUsd(Number(plan?.price ?? 0))));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const newEndsAt = extendSubscriptionEnd(months, undefined, company.subscription_ends_at);

  const changeMonths = (value: number) => {
    const next = Math.max(1, Math.min(24, Math.floor(value) || 1));
    setMonths(next);
    setAmount(String(roundUsd(Number(plan?.price ?? 0) * next)));
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(`/api/super-admin/companies/${company.id}/subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend", months, registerPayment, amountUsd: Number(amount), note }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; subscriptionEndsAt?: string | null };
      if (!res.ok) {
        setError(data.error ?? "No se pudo extender.");
        return;
      }
      setDone(`Listo: ahora vence el ${formatDay(data.subscriptionEndsAt ?? newEndsAt)}.`);
      setNote("");
      router.refresh();
    } catch {
      setError("No pudimos conectar. Revisa tu conexión.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      title="Extender suscripción"
      description="Suma meses de 30 días desde el vencimiento vigente (o desde hoy si ya venció). Reactiva la tienda y extiende los extras mensuales."
    >
      {isDevPlan ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">El plan interno no vence: no hace falta extenderlo.</p>
      ) : (
        <fieldset disabled={readOnly || busy} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Meses">
              <Input type="number" min={1} max={24} value={months} onChange={(e) => changeMonths(Number(e.target.value))} />
            </Field>
            <Field label="Vence ahora">
              <p className="flex h-10 items-center text-sm font-normal text-zinc-900 dark:text-zinc-100">{formatDay(company.subscription_ends_at)}</p>
            </Field>
            <Field label="Vencerá">
              <p className="flex h-10 items-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatDay(newEndsAt)}</p>
            </Field>
          </div>
          <label className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={registerPayment}
              onChange={(e) => setRegisterPayment(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-zinc-900"
            />
            <span>
              Registrar un pago recibido (efectivo, transferencia sin comprobante…). Desmárcalo si es una cortesía: no
              quedará un pago en el historial.
            </span>
          </label>
          {registerPayment ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Monto recibido (USD)">
                <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Nota (opcional)" className="md:col-span-2">
                <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Ej.: pagó en efectivo en la oficina" />
              </Field>
            </div>
          ) : (
            <Field label="Motivo de la cortesía (opcional)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            </Field>
          )}
          {error ? <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p> : null}
          {done ? <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">{done}</p> : null}
          <div className="flex justify-end">
            <Button type="button" onClick={() => void submit()} loading={busy}>
              Extender {months} {months === 1 ? "mes" : "meses"}
            </Button>
          </div>
        </fieldset>
      )}
    </SectionCard>
  );
}

export function CompanyPaymentsSection({ payments, plans }: { payments: CompanyPayment[]; plans: CompanyPlanOption[] }) {
  const planName = (id: string) => plans.find((plan) => plan.id === id)?.name ?? null;
  const concept = (payment: CompanyPayment) => {
    if (classifyPortalPaymentReference(payment.payment_reference)) return describePortalOrder(payment, { plan: planName });
    if (String(payment.payment_reference ?? "").startsWith("ADMIN-")) return "Extensión manual";
    const months = Math.max(1, Number(payment.months_paid ?? 1) || 1);
    return `Suscripción · ${months} ${months === 1 ? "mes" : "meses"}`;
  };

  return (
    <SectionCard title="Pagos" description="Los últimos pagos y pedidos de esta empresa, en dólares.">
      {payments.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Todavía no hay pagos.
        </p>
      ) : (
        <div className="-mx-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                <th className="px-5 pb-2 font-semibold sm:px-6">Fecha</th>
                <th className="px-3 pb-2 font-semibold">Concepto</th>
                <th className="px-3 pb-2 font-semibold">Monto</th>
                <th className="px-3 pb-2 font-semibold">Método</th>
                <th className="px-5 pb-2 font-semibold sm:px-6">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.map((payment) => {
                const badge = paymentStatus(payment.status);
                return (
                  <tr key={payment.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3 text-zinc-600 dark:text-zinc-400 sm:px-6">{formatDay(payment.payment_date)}</td>
                    <td className="px-3 py-3">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{concept(payment)}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-zinc-400">
                        {payment.reference_file_url ? (
                          <a href={payment.reference_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400">
                            {payment.payment_reference ?? "Comprobante"} <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        ) : (
                          payment.payment_reference ?? "—"
                        )}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatUsd(payment.amount_paid)}</td>
                    <td className="px-3 py-3 text-zinc-600 dark:text-zinc-400">{payment.payment_method ?? "—"}</td>
                    <td className="px-5 py-3 sm:px-6">
                      <SaasStatusBadge label={badge.label} variant={badge.variant} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
