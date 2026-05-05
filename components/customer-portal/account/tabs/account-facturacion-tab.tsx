"use client";

import { Download, ExternalLink, HelpCircle, CreditCard, Clock, FileText, CheckCircle2 } from "lucide-react";
import type { BillingPaymentResponse, PaymentSummary, CompanySnapshot } from "../../shared/customer-account-types";
import { displayStatus, fmtDate, fmtMoney } from "../../shared/customer-account-format";
import { PAYMENT_STATUS_LABELS } from "../../shared/customer-account-constants";
import { Badge, paymentStatusVariant } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { EmptyState } from "../../ui/EmptyState";
import { PageHeader } from "../../ui/PageHeader";
import { SegmentedControl } from "../../ui/SegmentedControl";
import { StatCard } from "../../ui/StatCard";

export type AccountFacturacionTabProps = {
  company: CompanySnapshot;
  billingPaidTotal: number | null;
  billingPendingTotal: number | null;
  pendingPaymentsCount: number;
  latestPaidPaymentDate: string | null;
  paymentStatusFilter: string;
  setPaymentStatusFilter: (v: string) => void;
  paymentReferenceQuery: string;
  setPaymentReferenceQuery: (v: string) => void;
  paymentDateFrom: string;
  setPaymentDateFrom: (v: string) => void;
  paymentDateTo: string;
  setPaymentDateTo: (v: string) => void;
  filteredPayments: PaymentSummary[];
  createdExpansionPayment: BillingPaymentResponse | null;
  onExportPaymentsCsv: () => void;
  onOpenBillingSupport: (payment: PaymentSummary) => void;
};

const statusFilterOptions = [
  { value: "all",                label: "Todos"      },
  { value: "paid",               label: "Pagados"    },
  { value: "pending",            label: "Pendientes" },
  { value: "pending_validation", label: "En revision" },
  { value: "failed",             label: "Fallidos"   },
] as const;

export function AccountFacturacionTab({
  company,
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
  onExportPaymentsCsv,
  onOpenBillingSupport,
}: AccountFacturacionTabProps) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader
        title="Facturacion"
        description="Historial de pagos y comprobantes."
        aside={
          <Button
            variant="secondary"
            size="sm"
            className="w-full justify-center sm:w-auto"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={onExportPaymentsCsv}
          >
            Exportar CSV
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        <StatCard label="Total pagado"      value={fmtMoney(billingPaidTotal,    company.currency, company.locale)} icon={CheckCircle2} accent="emerald" />
        <StatCard label="Pendiente"         value={fmtMoney(billingPendingTotal, company.currency, company.locale)} icon={Clock}        accent={pendingPaymentsCount > 0 ? "amber" : "indigo"} />
        <StatCard label="Pagos pendientes"  value={pendingPaymentsCount}                                            icon={CreditCard}   accent={pendingPaymentsCount > 0 ? "amber" : "indigo"} />
        <StatCard label="Ultimo pago aprobado" value={latestPaidPaymentDate ? fmtDate(latestPaidPaymentDate, company.timezone) : "-"} icon={FileText} accent="sky" />
      </div>

      {/* Filters */}
      <Card compact>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SegmentedControl
            options={statusFilterOptions as unknown as Array<{ value: string; label: string }>}
            value={paymentStatusFilter}
            onChange={setPaymentStatusFilter}
            size="sm"
          />
          <input
            type="text"
            placeholder="Buscar referencia…"
            value={paymentReferenceQuery}
            onChange={(e) => setPaymentReferenceQuery(e.target.value)}
            className="h-9 min-h-[2.25rem] w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm placeholder-[#a1a1a6] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:h-8 sm:flex-1 sm:min-w-[10rem]"
          />
          <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0">
            <input
              type="date"
              value={paymentDateFrom}
              onChange={(e) => setPaymentDateFrom(e.target.value)}
              className="h-9 min-h-[2.25rem] min-w-0 flex-1 rounded-xl border border-[#d2d2d7] bg-white px-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:h-8 sm:flex-none sm:px-3"
              aria-label="Desde"
            />
            <span className="shrink-0 text-xs text-[#a1a1a6]">a</span>
            <input
              type="date"
              value={paymentDateTo}
              onChange={(e) => setPaymentDateTo(e.target.value)}
              className="h-9 min-h-[2.25rem] min-w-0 flex-1 rounded-xl border border-[#d2d2d7] bg-white px-2 text-xs focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:h-8 sm:flex-none sm:px-3"
              aria-label="Hasta"
            />
          </div>
        </div>
      </Card>

      {/* Payment table */}
      <Card noPadding>
        {filteredPayments.length === 0 ? (
          <EmptyState icon={FileText} title="Sin pagos" description="No hay pagos que coincidan con los filtros seleccionados." className="py-12" />
        ) : (
          <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="bg-[#fbfbfd]">
                <tr>
                  {["Fecha", "Monto", "Estado", "Metodo", "Meses", "Referencia", ""].map((h, i) => (
                    <th key={i} className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a1a1a6] sm:px-4 sm:py-3 sm:text-xs">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f7]">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="group hover:bg-[#fbfbfd]">
                    <td className="whitespace-nowrap px-3 py-2.5 text-[#6e6e73] sm:px-4 sm:py-3">{fmtDate(payment.payment_date, company.timezone)}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-semibold text-[#1d1d1f] sm:px-4 sm:py-3">{fmtMoney(payment.amount_paid, company.currency, company.locale)}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      <Badge variant={paymentStatusVariant(payment.status)}>{displayStatus(payment.status, PAYMENT_STATUS_LABELS)}</Badge>
                    </td>
                    <td className="max-w-[7rem] truncate px-3 py-2.5 text-[#6e6e73] sm:max-w-none sm:px-4 sm:py-3">{payment.payment_method ?? "-"}</td>
                    <td className="px-3 py-2.5 text-[#6e6e73] sm:px-4 sm:py-3">{payment.months_paid ?? "-"}</td>
                    <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                      {payment.reference_file_url ? (
                        <a href={payment.reference_file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                          {payment.payment_reference ?? "Ver"} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-[#a1a1a6]">{payment.payment_reference ?? "-"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right sm:px-4 sm:py-3">
                      <button
                        type="button"
                        onClick={() => onOpenBillingSupport(payment)}
                        className="hidden rounded-lg p-1.5 text-[#a1a1a6] transition hover:bg-[#f5f5f7] hover:text-[#6e6e73] group-hover:block"
                        title="Reportar problema"
                      >
                        <HelpCircle className="h-4 w-4" aria-hidden />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
