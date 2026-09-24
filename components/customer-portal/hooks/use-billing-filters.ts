"use client";

import { useMemo, useState } from "react";

import { classifyPortalPaymentReference, isOpenOrder } from "@/lib/billing/portal-orders";
import { displayStatus } from "../shared/customer-account-format";
import { PAYMENT_STATUS_LABELS } from "../shared/customer-account-constants";
import type { PaymentSummary } from "../shared/customer-account-types";

export type PaymentStatusFilter = "all" | "paid" | "open" | "rejected" | "cancelled";

export type UseBillingFiltersReturn = {
  paymentStatusFilter: PaymentStatusFilter;
  setPaymentStatusFilter: (v: PaymentStatusFilter) => void;
  paymentReferenceQuery: string;
  setPaymentReferenceQuery: (v: string) => void;
  paymentDateFrom: string;
  setPaymentDateFrom: (v: string) => void;
  paymentDateTo: string;
  setPaymentDateTo: (v: string) => void;
  filteredPayments: PaymentSummary[];
  /** Cuántos pagos hay en total (sin filtros). */
  totalPayments: number;
  openOrders: PaymentSummary[];
  billingPaidTotal: number;
  billingPendingTotal: number;
  latestPaidPaymentDate: string | null;
  pendingPaymentsCount: number;
  handleExportPaymentsCsv: (describe: (payment: PaymentSummary) => string) => void;
};

const normalize = (status: string | null | undefined) => String(status ?? "").trim().toLowerCase();

export function useBillingFilters(paymentRows: PaymentSummary[]): UseBillingFiltersReturn {
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>("all");
  const [paymentReferenceQuery, setPaymentReferenceQuery] = useState("");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");

  const openOrders = useMemo(() => paymentRows.filter(isOpenOrder), [paymentRows]);

  const filteredPayments = useMemo(
    () =>
      paymentRows.filter((payment) => {
        const status = normalize(payment.status);
        if (paymentStatusFilter === "paid" && status !== "paid") return false;
        if (paymentStatusFilter === "open" && !isOpenOrder(payment)) return false;
        if (paymentStatusFilter === "rejected" && status !== "rejected") return false;
        if (paymentStatusFilter === "cancelled" && status !== "cancelled" && status !== "canceled") return false;
        const query = paymentReferenceQuery.trim().toLowerCase();
        if (query && !String(payment.payment_reference ?? "").toLowerCase().includes(query)) return false;
        const date = payment.payment_date ? new Date(payment.payment_date) : null;
        if (paymentDateFrom && (!date || date < new Date(`${paymentDateFrom}T00:00:00`))) return false;
        if (paymentDateTo && (!date || date > new Date(`${paymentDateTo}T23:59:59`))) return false;
        return true;
      }),
    [paymentRows, paymentStatusFilter, paymentReferenceQuery, paymentDateFrom, paymentDateTo],
  );

  const billingPaidTotal = useMemo(
    () => paymentRows.filter((p) => normalize(p.status) === "paid").reduce((acc, p) => acc + (Number(p.amount_paid ?? 0) || 0), 0),
    [paymentRows],
  );
  const billingPendingTotal = useMemo(
    () => openOrders.reduce((acc, p) => acc + (Number(p.amount_paid ?? 0) || 0), 0),
    [openOrders],
  );
  const latestPaidPaymentDate = useMemo(
    () => paymentRows.find((p) => normalize(p.status) === "paid")?.payment_date ?? null,
    [paymentRows],
  );

  const handleExportPaymentsCsv = (describe: (payment: PaymentSummary) => string) => {
    const headers = ["fecha", "concepto", "monto_usd", "estado", "metodo", "referencia", "comprobante_url"];
    const rows = filteredPayments.map((p) => [
      p.payment_date ?? "",
      classifyPortalPaymentReference(p.payment_reference) ? describe(p) : "Suscripción",
      String(p.amount_paid ?? ""),
      displayStatus(p.status, PAYMENT_STATUS_LABELS),
      p.payment_method ?? "",
      p.payment_reference ?? "",
      p.reference_file_url ?? "",
    ]);
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map((cell) => escapeCell(String(cell))).join(",")).join("\n");
    // BOM para que Excel abra bien las tildes.
    const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff), csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pagos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
    paymentStatusFilter,
    setPaymentStatusFilter,
    paymentReferenceQuery,
    setPaymentReferenceQuery,
    paymentDateFrom,
    setPaymentDateFrom,
    paymentDateTo,
    setPaymentDateTo,
    filteredPayments,
    totalPayments: paymentRows.length,
    openOrders,
    billingPaidTotal,
    billingPendingTotal,
    latestPaidPaymentDate,
    pendingPaymentsCount: openOrders.length,
    handleExportPaymentsCsv,
  };
}
