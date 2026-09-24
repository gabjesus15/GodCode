"use client";

import { useState } from "react";

import { roundUsd } from "@/lib/billing/portal-pricing";
import type {
  BillingOptionsResponse,
  BranchExpansionResponse,
  CompanySnapshot,
  PaymentSummary,
  TicketSummary,
} from "../shared/customer-account-types";

const MAX_BRANCHES_PER_ORDER = 10;

export type UseBranchFlowParams = {
  company: CompanySnapshot;
  billingOptions: BillingOptionsResponse | null;
  activeBranchesCount: number;
  onTicketCreated: (ticket?: TicketSummary) => void;
  /** Se creó el pedido de sucursales extra: abrir el diálogo de pago. */
  onOrderCreated: (order: PaymentSummary) => void;
  onReload: () => Promise<void>;
};

/**
 * "Agregar sucursal" en /cuenta. Con cupo en el plan es una solicitud sin pago; sin cupo,
 * se compran sucursales extra (vencen con la suscripción: hoy se paga hasta el
 * vencimiento). En ambos casos la sucursal la crea nuestro equipo con los datos pedidos.
 */
export function useBranchFlow({ company, billingOptions, activeBranchesCount, onTicketCreated, onOrderCreated, onReload }: UseBranchFlowParams) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [quantity, setQuantityState] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const withPayment = billingOptions?.requiresPaymentForExpansion === true;
  const quote = billingOptions?.expansionQuote ?? null;
  const amount = quote ? roundUsd(quote.amountPerBranch * quantity) : null;
  const effectiveMax = billingOptions?.effectiveMaxBranches ?? billingOptions?.maxBranches ?? null;
  const projectedMax = effectiveMax == null ? null : effectiveMax + (withPayment ? quantity : 0);

  const setQuantity = (value: number) => setQuantityState(Math.max(1, Math.min(MAX_BRANCHES_PER_ORDER, Math.floor(value) || 1)));

  const reset = () => {
    setStep(1);
    setName("");
    setAddress("");
    setNotes("");
    setQuantityState(1);
    setError(null);
  };

  const openWizard = () => {
    reset();
    setOk(null);
    setOpen(true);
  };

  const next = () => {
    if (!name.trim()) {
      setError("Escribe el nombre de la sucursal.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const back = () => {
    setError(null);
    setStep(1);
  };

  const submitRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/tenant/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `Nueva sucursal: ${name.trim()}`,
          description: [
            `Nombre: ${name.trim()}`,
            `Dirección: ${address.trim() || "Sin dirección"}`,
            notes.trim() ? `Notas: ${notes.trim()}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          category: "account",
          priority: "medium",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; ticket?: TicketSummary };
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar la solicitud.");
        return;
      }
      onTicketCreated(data.ticket);
      setOpen(false);
      setOk(`Recibimos tu solicitud para «${name.trim()}». Te avisamos por Soporte cuando la sucursal esté lista.`);
      reset();
    } finally {
      setBusy(false);
    }
  };

  const submitExpansion = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/customer-account/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity,
          branchName: name.trim(),
          branchAddress: address.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<BranchExpansionResponse> & { error?: string };
      if (!res.ok || !data.order) {
        setError(data.error ?? "No se pudo crear el pago.");
        return;
      }
      setOpen(false);
      reset();
      onOrderCreated(data.order);
      await onReload();
    } finally {
      setBusy(false);
    }
  };

  return {
    company,
    open,
    setOpen,
    step,
    name,
    setName,
    address,
    setAddress,
    notes,
    setNotes,
    quantity,
    setQuantity,
    withPayment,
    quote,
    unitMonthly: billingOptions?.branchExpansionPriceMonthly ?? null,
    amount,
    activeBranchesCount,
    projectedMax,
    busy,
    error,
    ok,
    setOk,
    openWizard,
    next,
    back,
    submit: withPayment ? submitExpansion : submitRequest,
  };
}

export type BranchFlow = ReturnType<typeof useBranchFlow>;
