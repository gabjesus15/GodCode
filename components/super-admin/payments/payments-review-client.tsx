"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, Inbox } from "lucide-react";

import { formatUsd } from "@/lib/billing/portal-pricing";
import { formatAdminDateTime } from "@/lib/super-admin/admin-format";
import type { PaymentReviewItem } from "@/lib/super-admin/payment-review-queue";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { SaasMetricCard } from "@/components/super-admin/shared/saas-metric-card";

type Filter = "all" | "portal" | "onboarding";
type PendingAction = { item: PaymentReviewItem; action: "validate" | "reject" } | null;

const formatWhen = (iso: string | null) => formatAdminDateTime(iso);

export function PaymentsReviewClient({
  items,
  awaitingCustomerCount,
  error,
  readOnly,
}: {
  items: PaymentReviewItem[];
  awaitingCustomerCount: number;
  error: string | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, setPending] = useState<PendingAction>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = useMemo(() => (filter === "all" ? items : items.filter((item) => item.source === filter)), [items, filter]);
  const total = items.reduce((sum, item) => sum + item.amountUsd, 0);
  const counts = {
    all: items.length,
    portal: items.filter((item) => item.source === "portal").length,
    onboarding: items.filter((item) => item.source === "onboarding").length,
  };

  const closeModal = () => {
    if (busy) return;
    setPending(null);
    setReason("");
    setActionError(null);
  };

  const runAction = async () => {
    if (!pending) return;
    setBusy(true);
    setActionError(null);
    try {
      const { item, action } = pending;
      const res = await fetch(`/api/super-admin/payments/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(item.paymentId ? { payment_id: item.paymentId } : { payment_reference: item.paymentReference }),
          ...(action === "reject" ? { reason: reason.trim() || undefined } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setActionError(data.error ?? "No se pudo procesar el pago.");
        return;
      }
      setNotice(data.message ?? (action === "validate" ? "Pago validado." : "Pago rechazado."));
      setPending(null);
      setReason("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-w-0 space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          No se pudo cargar todo: {error}
        </div>
      )}
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-medium underline-offset-2 hover:underline">
            Cerrar
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SaasMetricCard label="Por validar" value={String(items.length)} helper="Pagos con comprobante esperando revisión." />
        <SaasMetricCard label="Monto por validar" value={formatUsd(total)} helper="Suma en dólares de la cola." />
        <SaasMetricCard
          label="Esperando al cliente"
          value={String(awaitingCustomerCount)}
          helper="Pedidos creados en /cuenta que el cliente aún no paga."
        />
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar pagos">
        {(
          [
            { value: "all", label: "Todos" },
            { value: "portal", label: "Clientes" },
            { value: "onboarding", label: "Altas" },
          ] as const
        ).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === option.value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {option.label} · {counts[option.value]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <Card className="shadow-none flex flex-col items-center gap-2 rounded-2xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <Inbox className="h-8 w-8 text-zinc-300 dark:text-zinc-600" aria-hidden />
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">No hay pagos por validar</p>
          <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">Cuando un cliente envíe un comprobante aparecerá aquí.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.key}>
              <Card className="shadow-none rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          item.source === "portal"
                            ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
                            : "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        }`}
                      >
                        {item.source === "portal" ? "Cliente" : "Alta"}
                      </span>
                      {item.companyId ? (
                        <Link href={`/dashboard/empresa/${item.companyId}`} className="truncate text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-100">
                          {item.businessName}
                        </Link>
                      ) : (
                        <span className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.businessName}</span>
                      )}
                      {item.contactEmail && <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">{item.contactEmail}</span>}
                    </div>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{item.concept}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {item.method ?? "Método sin indicar"} · {formatWhen(item.submittedAt)} ·{" "}
                      <span className="font-mono">{item.paymentReference}</span>
                    </p>
                    {item.note && (
                      <p className="flex items-start gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> {item.note}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 lg:items-end">
                    <p className="text-xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatUsd(item.amountUsd)}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.receiptUrl && (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-zinc-200 px-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        >
                          Comprobante <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        </a>
                      )}
                      {!readOnly && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setPending({ item, action: "reject" })}>
                            Rechazar
                          </Button>
                          <Button size="sm" onClick={() => setPending({ item, action: "validate" })}>
                            Validar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={pending != null}
        onClose={closeModal}
        title={pending?.action === "reject" ? "Rechazar pago" : "Validar pago"}
        description={pending ? `${pending.item.businessName} · ${pending.item.concept} · ${formatUsd(pending.item.amountUsd)}` : undefined}
      >
        {pending?.action === "reject" ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Le avisamos al cliente por correo para que envíe otro comprobante o pague con PayPal.
            </p>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400" htmlFor="reject-reason">
              Motivo (lo verá el cliente)
            </label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={280}
              placeholder="Ej.: el monto no coincide, o no vemos la transferencia en la cuenta."
            />
          </div>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Confirma que el dinero llegó. Al validar se aplica lo comprado y el cliente recibe un correo.
          </p>
        )}
        {actionError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{actionError}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={closeModal} disabled={busy}>
            Volver
          </Button>
          <Button variant={pending?.action === "reject" ? "destructive" : "default"} loading={busy} onClick={() => void runAction()}>
            {pending?.action === "reject" ? "Rechazar y avisar" : "Validar pago"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
