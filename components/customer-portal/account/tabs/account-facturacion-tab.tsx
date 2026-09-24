"use client";

import { CheckCircle2, Clock, CreditCard, Download, ExternalLink, FileText, HelpCircle } from "lucide-react";

import { classifyPortalPaymentReference, isOpenOrder, isOrderAwaitingPayment } from "@/lib/billing/portal-orders";
import type { PaymentStatusFilter, UseBillingFiltersReturn } from "../../hooks/use-billing-filters";
import { fmtDay, fmtUsd, paymentStatusLabel } from "../../shared/customer-account-format";
import type { CompanySnapshot, PaymentSummary } from "../../shared/customer-account-types";
import { Badge, paymentStatusVariant } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { EmptyState } from "../../ui/EmptyState";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { StatCard } from "../../ui/StatCard";

export type AccountFacturacionTabProps = {
  company: CompanySnapshot;
  billing: UseBillingFiltersReturn;
  describeOrder: (payment: PaymentSummary) => string;
  onPayOrder: (payment: PaymentSummary) => void;
  onOpenBillingSupport: (payment: PaymentSummary) => void;
};

const statusFilterOptions: Array<{ value: PaymentStatusFilter; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "paid", label: "Pagados" },
  { value: "open", label: "Pendientes" },
  { value: "rejected", label: "Rechazados" },
  { value: "cancelled", label: "Anulados" },
];

const inputClass =
  "h-9 min-h-[2.25rem] rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm placeholder-[#a1a1a6] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:h-8";

export function AccountFacturacionTab({ company, billing, describeOrder, onPayOrder, onOpenBillingSupport }: AccountFacturacionTabProps) {
  const {
    billingPaidTotal,
    billingPendingTotal,
    pendingPaymentsCount,
    latestPaidPaymentDate,
    paymentStatusFilter,
    setPaymentStatusFilter,
    paymentReferenceQuery,
    setPaymentReferenceQuery,
    paymentDateFrom,
    setPaymentDateFrom,
    paymentDateTo,
    setPaymentDateTo,
    filteredPayments,
  } = billing;

  const concept = (payment: PaymentSummary) => {
    if (classifyPortalPaymentReference(payment.payment_reference)) return describeOrder(payment);
    const months = Math.max(1, Number(payment.months_paid ?? 1) || 1);
    return `Suscripción · ${months} ${months === 1 ? "mes" : "meses"}`;
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Facturación"
        description="Tus pagos a Gcode, en dólares (USD), y los comprobantes que enviaste."
        aside={
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center sm:w-auto"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => billing.handleExportPaymentsCsv(concept)}
          >
            Exportar CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatCard label="Total pagado" value={fmtUsd(billingPaidTotal, company.locale)} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Por pagar" value={fmtUsd(billingPendingTotal, company.locale)} icon={Clock} accent={pendingPaymentsCount > 0 ? "amber" : "indigo"} />
        <StatCard label="Pagos pendientes" value={pendingPaymentsCount} icon={CreditCard} accent={pendingPaymentsCount > 0 ? "amber" : "indigo"} />
        <StatCard label="Último pago" value={latestPaidPaymentDate ? fmtDay(latestPaidPaymentDate, company.timezone) : "-"} icon={FileText} accent="sky" />
      </div>

      <Card compact>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SegmentedControl options={statusFilterOptions} value={paymentStatusFilter} onChange={setPaymentStatusFilter} size="sm" />
          <input
            type="search"
            placeholder="Buscar referencia…"
            aria-label="Buscar por referencia"
            value={paymentReferenceQuery}
            onChange={(e) => setPaymentReferenceQuery(e.target.value)}
            className={`${inputClass} w-full sm:min-w-[10rem] sm:flex-1`}
          />
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0">
            <input type="date" value={paymentDateFrom} onChange={(e) => setPaymentDateFrom(e.target.value)} className={`${inputClass} min-w-0 flex-1 px-2 text-xs sm:flex-none`} aria-label="Desde" />
            <span className="shrink-0 text-xs text-[#a1a1a6]">a</span>
            <input type="date" value={paymentDateTo} onChange={(e) => setPaymentDateTo(e.target.value)} className={`${inputClass} min-w-0 flex-1 px-2 text-xs sm:flex-none`} aria-label="Hasta" />
          </div>
        </div>
      </Card>

      <Card noPadding>
        {filteredPayments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={billing.totalPayments === 0 ? "Todavía no hay pagos" : "Sin resultados"}
            description={billing.totalPayments === 0 ? "Aquí verás cada pago a Gcode y sus comprobantes." : "Ningún pago coincide con estos filtros."}
            className="py-12"
          />
        ) : (
          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[40rem] text-sm">
              <thead className="bg-[#fbfbfd]">
                <tr>
                  {["Fecha", "Concepto", "Monto", "Estado", "Método", ""].map((header, index) => (
                    <th key={index} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a1a1a6] sm:px-4 sm:py-3 sm:text-xs">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f7]">
                {filteredPayments.map((payment) => {
                  const open = isOpenOrder(payment);
                  const awaiting = open && isOrderAwaitingPayment(payment);
                  return (
                    <tr key={payment.id} className="group align-top hover:bg-[#fbfbfd]">
                      <td className="whitespace-nowrap px-3 py-3 text-[#6e6e73] sm:px-4">{fmtDay(payment.payment_date, company.timezone)}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <p className="font-medium text-[#1d1d1f]">{concept(payment)}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-[#a1a1a6]">
                          {payment.reference_file_url ? (
                            <a href={payment.reference_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                              {payment.payment_reference ?? "Comprobante"} <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          ) : (
                            payment.payment_reference ?? "-"
                          )}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums text-[#1d1d1f] sm:px-4">{fmtUsd(payment.amount_paid, company.locale)}</td>
                      <td className="px-3 py-3 sm:px-4">
                        <Badge variant={paymentStatusVariant(payment.status)}>{paymentStatusLabel(payment.status)}</Badge>
                      </td>
                      <td className="max-w-[8rem] truncate px-3 py-3 text-[#6e6e73] sm:max-w-none sm:px-4">{payment.payment_method ?? "-"}</td>
                      <td className="px-3 py-3 text-right sm:px-4">
                        <div className="flex items-center justify-end gap-1">
                          {open && (
                            <Button size="sm" variant={awaiting ? "primary" : "secondary"} onClick={() => onPayOrder(payment)}>
                              {awaiting ? "Pagar" : "Ver"}
                            </Button>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenBillingSupport(payment)}
                            className="rounded-lg p-1.5 text-[#a1a1a6] transition hover:bg-[#f5f5f7] hover:text-[#6e6e73]"
                            title="Consultar sobre este pago"
                            aria-label="Consultar sobre este pago"
                          >
                            <HelpCircle className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
