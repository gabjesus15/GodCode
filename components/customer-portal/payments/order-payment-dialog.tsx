"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Clock, Copy, ExternalLink, ImageUp, Loader2 } from "lucide-react";

import { isOrderAwaitingPayment } from "@/lib/billing/portal-orders";
import { uploadImage } from "@/lib/storage/upload-image-client";
import { fmtDay, fmtUsd, formatPaymentConfigKey, paymentStatusLabel } from "../shared/customer-account-format";
import type { BillingOptionsResponse, CompanySnapshot, PaymentSummary } from "../shared/customer-account-types";
import { Alert } from "../ui/Alert";
import { Badge, paymentStatusVariant } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Dialog, DialogFooter } from "../ui/Dialog";
import { PayPalButtons } from "./paypal-buttons";

export type OrderPaymentDialogProps = {
  order: PaymentSummary | null;
  /** Qué se paga, p. ej. "Renovación Pro · 3 meses". */
  concept: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: CompanySnapshot;
  billingOptions: BillingOptionsResponse | null;
  billingLoading: boolean;
  /** Algo cambió (pagado, comprobante enviado, anulado): recargar datos. */
  onChanged: () => void | Promise<void>;
};

type Outcome = { tone: "success" | "info"; title: string; message: string };

const PAYPAL = "paypal";

function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
      aria-label={`Copiar ${value}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

export function OrderPaymentDialog({
  order,
  concept,
  open,
  onOpenChange,
  company,
  billingOptions,
  billingLoading,
  onChanged,
}: OrderPaymentDialogProps) {
  const manualMethods = useMemo(() => billingOptions?.paymentMethods ?? [], [billingOptions?.paymentMethods]);
  const paypalClientId = billingOptions?.paypalClientId ?? null;
  // El estado es de un pedido: quien lo usa monta el diálogo con `key={order.id}`.
  const [chosenMethod, setChosenMethod] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [vesRate, setVesRate] = useState<number | null>(null);

  const orderId = order?.id ?? null;

  const amount = Number(order?.amount_paid ?? 0);
  const status = String(order?.status ?? "").toLowerCase();
  const awaiting = order ? isOrderAwaitingPayment(order) : false;
  // Con un comprobante en revisión solo se puede cambiar el comprobante (no pagar con PayPal).
  const inReview = status === "pending_validation" && Boolean(order?.reference_file_url);

  // Método elegido; si no hay (o ya no está), el que usó antes, si no PayPal, si no el primero manual.
  const availableMethods = useMemo(
    () => [...(paypalClientId && !inReview ? [PAYPAL] : []), ...manualMethods.map((m) => m.slug)],
    [paypalClientId, inReview, manualMethods],
  );
  const previousMethod = order?.payment_method_slug ?? "";
  const method = availableMethods.includes(chosenMethod)
    ? chosenMethod
    : availableMethods.includes(previousMethod)
      ? previousMethod
      : (availableMethods[0] ?? "");

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // En Venezuela se muestra el monto aproximado en bolívares (misma tasa que el alta).
  useEffect(() => {
    if (!open || company.currency !== "VES" || vesRate != null) return;
    let cancelled = false;
    fetch("/api/onboarding/bcv-rate")
      .then((res) => res.json())
      .then((data: { rate?: number }) => {
        if (!cancelled && typeof data.rate === "number" && data.rate > 0) setVesRate(data.rate);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open, company.currency, vesRate]);

  const selectedManual = manualMethods.find((m) => m.slug === method) ?? null;

  const createPayPalOrder = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/customer-account/paypal/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId: orderId }),
    });
    const data = (await res.json().catch(() => ({}))) as { orderId?: string; error?: string };
    if (!res.ok || !data.orderId) {
      const message = data.error ?? "No pudimos iniciar el pago con PayPal.";
      setError(message);
      throw new Error(message);
    }
    return data.orderId;
  }, [orderId]);

  const capturePayPalOrder = useCallback(
    async (paypalOrderId: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/customer-account/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: paypalOrderId }),
        });
        const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        if (!res.ok) {
          setError(data.error ?? "No pudimos confirmar el pago. Si PayPal te cobró, lo verás aplicado en unos minutos.");
          return;
        }
        setOutcome({ tone: "success", title: "Pago recibido", message: data.message ?? "Tu pago quedó aplicado." });
        await onChanged();
      } finally {
        setBusy(false);
      }
    },
    [onChanged],
  );

  const submitReceipt = async () => {
    if (!order || !file) return;
    if (!selectedManual) {
      setError("Elige con qué método pagaste.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const referenceFileUrl = await uploadImage(file, "payment-reference");
      const res = await fetch("/api/customer-account/billing/reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: order.id, referenceFileUrl, methodSlug: selectedManual.slug }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo enviar el comprobante.");
        return;
      }
      setFile(null);
      setOutcome({
        tone: "info",
        title: "Comprobante enviado",
        message: data.message ?? "Lo revisamos y te avisamos por correo.",
      });
      await onChanged();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "No se pudo subir el archivo.");
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/customer-account/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: order.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo anular el pago.");
        setConfirmCancel(false);
        return;
      }
      await onChanged();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const methodOptions = [
    ...(paypalClientId && !inReview ? [{ slug: PAYPAL, name: "PayPal", hint: "Tarjeta o saldo PayPal · se aplica al instante" }] : []),
    ...manualMethods.map((m) => ({ slug: m.slug, name: m.name, hint: "Transfieres y subes el comprobante" })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Pagar" description={concept} size="lg">
      {!order ? null : (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3 rounded-xl bg-[#fbfbfd] px-4 py-3.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-[#6e6e73]">Total</p>
              <p className="text-2xl font-semibold tracking-tight text-[#1d1d1f] tabular-nums">{fmtUsd(amount, company.locale)}</p>
              {vesRate != null && (
                <p className="mt-0.5 text-xs text-[#6e6e73]">
                  ≈ {(amount * vesRate).toLocaleString("es-VE", { maximumFractionDigits: 2 })} Bs (referencial, tasa del día)
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <Badge variant={paymentStatusVariant(order.status)}>{paymentStatusLabel(order.status)}</Badge>
              <p className="mt-1 font-mono text-[11px] text-[#a1a1a6]">{order.payment_reference}</p>
            </div>
          </div>

          {outcome ? (
            <Alert variant={outcome.tone === "success" ? "success" : "info"} title={outcome.title}>
              {outcome.message}
            </Alert>
          ) : status === "paid" ? (
            <Alert variant="success" title="Pagado">
              Este pago ya quedó aplicado{order.payment_date ? ` el ${fmtDay(order.payment_date, company.timezone)}` : ""}.
            </Alert>
          ) : inReview ? (
            <div className="space-y-3">
              <Alert variant="info" title="Estamos revisando tu comprobante">
                Te avisamos por correo en cuanto lo validemos (normalmente el mismo día hábil). Si te equivocaste de archivo,
                puedes cambiarlo.
              </Alert>
              {order.reference_file_url && (
                <a
                  href={order.reference_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
                >
                  Ver comprobante enviado <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
              )}
            </div>
          ) : !awaiting ? (
            <Alert variant="neutral">Este pago ya no se puede pagar.</Alert>
          ) : null}

          {!outcome && (awaiting || inReview) && (
            <>
              {status === "rejected" && (
                <Alert variant="warning" title="No pudimos validar el comprobante anterior">
                  Te enviamos el motivo por correo. Sube otro comprobante o paga con PayPal.
                </Alert>
              )}

              {billingLoading && methodOptions.length === 0 ? (
                <div className="h-24 animate-pulse rounded-xl bg-[#f5f5f7]" />
              ) : methodOptions.length === 0 ? (
                <Alert variant="warning" title="No hay métodos de pago para tu país">
                  Escríbenos a <a className="font-medium text-indigo-600" href={`mailto:${company.supportEmail}`}>{company.supportEmail}</a> y
                  te indicamos cómo pagar.
                </Alert>
              ) : (
                <fieldset className="space-y-2">
                  <legend className="mb-2 text-xs font-medium text-[#6e6e73]">
                    {inReview ? "¿Cambiar el comprobante?" : "¿Cómo quieres pagar?"}
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {methodOptions
                      .map((option) => {
                        const active = option.slug === method;
                        return (
                          <label
                            key={option.slug}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition ${
                              active ? "border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500" : "border-[#e5e5ea] hover:bg-[#fbfbfd]"
                            }`}
                          >
                            <input
                              type="radio"
                              name="order-payment-method"
                              value={option.slug}
                              checked={active}
                              onChange={() => {
                                setChosenMethod(option.slug);
                                setError(null);
                              }}
                              className="mt-0.5 accent-indigo-600"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-medium text-[#1d1d1f]">{option.name}</span>
                              <span className="block text-xs text-[#6e6e73]">{option.hint}</span>
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </fieldset>
              )}

              {method === PAYPAL && paypalClientId && awaiting && (
                <div className="space-y-2">
                  <PayPalButtons
                    clientId={paypalClientId}
                    createOrder={createPayPalOrder}
                    onApprove={capturePayPalOrder}
                    onCancel={() => setError("Cancelaste el pago en PayPal. Puedes intentarlo de nuevo cuando quieras.")}
                    onError={(message) => setError(message)}
                  />
                  {busy && (
                    <p className="flex items-center gap-2 text-sm text-[#6e6e73]">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Confirmando el pago…
                    </p>
                  )}
                </div>
              )}

              {selectedManual && method !== PAYPAL && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#e5e5ea] bg-white">
                    <p className="border-b border-[#f5f5f7] px-4 py-2.5 text-sm font-semibold text-[#1d1d1f]">
                      Datos para pagar con {selectedManual.name}
                    </p>
                    {Object.keys(selectedManual.config).length === 0 ? (
                      <p className="px-4 py-3 text-sm text-[#6e6e73]">
                        Escríbenos a {company.supportEmail} y te enviamos los datos para pagar.
                      </p>
                    ) : (
                      <dl className="divide-y divide-[#f5f5f7]">
                        {Object.entries(selectedManual.config).map(([key, value]) => (
                          <div key={key} className="flex items-center justify-between gap-3 px-4 py-2">
                            <div className="min-w-0">
                              <dt className="text-xs text-[#6e6e73]">{formatPaymentConfigKey(key)}</dt>
                              <dd className="break-words text-sm font-medium text-[#1d1d1f]">{value}</dd>
                            </div>
                            {value && <CopyValue value={value} />}
                          </div>
                        ))}
                      </dl>
                    )}
                    <p className="border-t border-[#f5f5f7] px-4 py-2.5 text-xs text-[#6e6e73]">
                      Monto: <strong className="text-[#1d1d1f]">{fmtUsd(amount, company.locale)}</strong>. Si tu banco lo permite,
                      escribe <span className="font-mono">{order.payment_reference}</span> en el concepto.
                    </p>
                  </div>

                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border border-dashed px-4 py-4 transition ${
                      file ? "border-indigo-300 bg-indigo-50/40" : "border-[#d2d2d7] bg-[#fbfbfd] hover:border-indigo-400"
                    } ${busy ? "pointer-events-none opacity-60" : ""}`}
                  >
                    {previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:)
                      <img src={previewUrl} alt="Comprobante elegido" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white">
                        <ImageUp className="h-6 w-6 text-[#a1a1a6]" aria-hidden />
                      </span>
                    )}
                    <span className="min-w-0 text-sm">
                      <span className="block font-medium text-[#1d1d1f]">
                        {file ? file.name : "Elige la captura o foto del comprobante"}
                      </span>
                      <span className="block text-xs text-[#6e6e73]">JPG, PNG o WebP · hasta 5 MB</span>
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      disabled={busy}
                      onChange={(event) => {
                        setFile(event.target.files?.[0] ?? null);
                        setError(null);
                      }}
                    />
                  </label>

                  <Button className="w-full justify-center" loading={busy} disabled={!file} onClick={() => void submitReceipt()}>
                    Enviar comprobante
                  </Button>
                </div>
              )}
            </>
          )}

          {error && <Alert variant="danger" onDismiss={() => setError(null)}>{error}</Alert>}

          {!outcome && awaiting && (
            <div className="flex items-center gap-2 text-xs text-[#6e6e73]">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {method === PAYPAL
                ? "Con PayPal se aplica al instante."
                : "Con transferencia se aplica cuando validamos el comprobante."}
            </div>
          )}
        </div>
      )}

      <DialogFooter>
        {order && awaiting && !outcome && (
          confirmCancel ? (
            <>
              <span className="text-sm text-[#6e6e73] sm:mr-auto">¿Anular este pago?</span>
              <Button variant="secondary" onClick={() => setConfirmCancel(false)} disabled={busy}>
                No
              </Button>
              <Button variant="danger" loading={busy} onClick={() => void cancelOrder()}>
                Sí, anular
              </Button>
            </>
          ) : (
            <Button variant="ghost" className="text-red-600 hover:bg-red-50 sm:mr-auto" onClick={() => setConfirmCancel(true)} disabled={busy}>
              Anular pago
            </Button>
          )
        )}
        {!confirmCancel && (
          <Button variant={outcome ? "primary" : "secondary"} onClick={() => onOpenChange(false)} icon={outcome ? <CheckCircle2 className="h-4 w-4" /> : undefined}>
            {outcome ? "Listo" : "Cerrar"}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
