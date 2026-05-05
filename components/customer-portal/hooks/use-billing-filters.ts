"use client";

import { useMemo, useState } from "react";
import type { PaymentSummary } from "../shared/customer-account-types";
import { displayStatus } from "../shared/customer-account-format";
import { PAYMENT_STATUS_LABELS } from "../shared/customer-account-constants";

export type UseBillingFiltersReturn = {
  paymentStatusFilter:    string;
  setPaymentStatusFilter: (v: string) => void;
  paymentReferenceQuery:  string;
  setPaymentReferenceQuery: (v: string) => void;
  paymentDateFrom:        string;
  setPaymentDateFrom:     (v: string) => void;
  paymentDateTo:          string;
  setPaymentDateTo:       (v: string) => void;
  filteredPayments:       PaymentSummary[];
  billingPaidTotal:       number;
  billingPendingTotal:    number;
  latestPaidPaymentDate:  string | null;
  pendingPaymentsCount:   number;
  handleExportPaymentsCsv: () => void;
};

export function useBillingFilters(paymentRows: PaymentSummary[], _currency: string, _locale: string): UseBillingFiltersReturn {
  const [paymentStatusFilter,    setPaymentStatusFilter]    = useState("all");
  const [paymentReferenceQuery,  setPaymentReferenceQuery]  = useState("");
  const [paymentDateFrom,        setPaymentDateFrom]        = useState("");
  const [paymentDateTo,          setPaymentDateTo]          = useState("");

  const filteredPayments = useMemo(() => paymentRows.filter((p) => {
    if (paymentStatusFilter !== "all" && String(p.status ?? "").toLowerCase() !== paymentStatusFilter) return false;
    if (paymentReferenceQuery.trim() && !String(p.payment_reference ?? "").toLowerCase().includes(paymentReferenceQuery.trim().toLowerCase())) return false;
    const d = p.payment_date ? new Date(p.payment_date) : null;
    if (paymentDateFrom && (!d || d < new Date(`${paymentDateFrom}T00:00:00`))) return false;
    if (paymentDateTo   && (!d || d > new Date(`${paymentDateTo}T23:59:59`)))   return false;
    return true;
  }), [paymentRows, paymentStatusFilter, paymentReferenceQuery, paymentDateFrom, paymentDateTo]);

  const billingPaidTotal    = useMemo(() => paymentRows.filter((p) => String(p.status ?? "").toLowerCase() === "paid").reduce((acc, p) => acc + (Number(p.amount_paid ?? 0) || 0), 0), [paymentRows]);
  const billingPendingTotal = useMemo(() => paymentRows.filter((p) => { const s = String(p.status ?? "").toLowerCase(); return s === "pending" || s === "pending_validation"; }).reduce((acc, p) => acc + (Number(p.amount_paid ?? 0) || 0), 0), [paymentRows]);
  const latestPaidPaymentDate = useMemo(() => paymentRows.find((p) => String(p.status ?? "").toLowerCase() === "paid")?.payment_date ?? null, [paymentRows]);
  const pendingPaymentsCount  = useMemo(() => paymentRows.filter((p) => { const s = String(p.status ?? "").toLowerCase(); return s === "pending" || s === "pending_validation"; }).length, [paymentRows]);

  const handleExportPaymentsCsv = () => {
    const headers = ["fecha", "monto", "estado", "metodo", "meses", "referencia", "comprobante_url"];
    const rows = filteredPayments.map((p) => [p.payment_date ?? "", String(p.amount_paid ?? ""), displayStatus(p.status, PAYMENT_STATUS_LABELS), p.payment_method ?? "", String(p.months_paid ?? ""), p.payment_reference ?? "", p.reference_file_url ?? ""]);
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map((c) => esc(String(c))).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `cuenta_pagos_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return { paymentStatusFilter, setPaymentStatusFilter, paymentReferenceQuery, setPaymentReferenceQuery, paymentDateFrom, setPaymentDateFrom, paymentDateTo, setPaymentDateTo, filteredPayments, billingPaidTotal, billingPendingTotal, latestPaidPaymentDate, pendingPaymentsCount, handleExportPaymentsCsv };
}
