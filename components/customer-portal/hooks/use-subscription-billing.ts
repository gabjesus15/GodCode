"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { resolveSubscriptionPhase, type RenewalMonths } from "@/lib/billing/portal-pricing";
import type {
  AddonPurchasePreview,
  PaymentSummary,
  PlanChangePreview,
  RenewalQuoteResponse,
} from "../shared/customer-account-types";

export type BillingFeedback = { tone: "success" | "danger" | "info"; message: string } | null;

type JsonResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function requestJson<T>(url: string, init?: RequestInit): Promise<JsonResult<T>> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? "Algo salió mal. Intenta de nuevo." };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "No pudimos conectar. Revisa tu conexión." };
  }
}

/**
 * Lee `url` cada vez que cambia `key` (`null` = no leer). El estado solo se toca en el
 * callback de la petición, y `loading` se deriva de si el resultado es de la clave vigente.
 */
function useKeyedFetch<T>(key: string | null, url: string | null, delayMs = 0) {
  const [result, setResult] = useState<{ key: string; data: T | null; error: string | null } | null>(null);
  useEffect(() => {
    if (!key || !url) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void requestJson<T>(url).then((response) => {
        if (cancelled) return;
        setResult({ key, data: response.ok ? response.data : null, error: response.ok ? null : response.error });
      });
    }, delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, url, delayMs]);
  const current = key != null && result?.key === key ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: key != null && current == null,
    /** Último resultado aunque sea de otra clave: para no parpadear mientras se recotiza. */
    stale: result?.data ?? null,
  };
}

const postJson = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export type UseSubscriptionBillingParams = {
  subscriptionStatus: string | null;
  subscriptionEndsAt: string | null;
  /** Recarga suscripción y pagos después de cualquier cambio. */
  onRefresh: () => Promise<void>;
  onSubscriptionChange: (status: string, endsAt: string | null) => void;
  /** Se creó un pedido: abrir el diálogo de pago. */
  onOrderCreated: (order: PaymentSummary) => void;
  /** Hay un pedido abierto que bloquea: abrir el diálogo de pago con ese pedido. */
  onOpenOrder: (orderId: string) => void;
};

/**
 * Acciones sobre la suscripción desde /cuenta: renovar, cambiar de plan (con prorrateo),
 * anular un cambio programado, cancelar al vencimiento y reactivar. Los montos los calcula
 * siempre el servidor; aquí solo se muestran.
 */
export function useSubscriptionBilling(params: UseSubscriptionBillingParams) {
  const { subscriptionStatus, subscriptionEndsAt, onRefresh, onSubscriptionChange, onOrderCreated, onOpenOrder } = params;
  const phase = resolveSubscriptionPhase(subscriptionStatus, subscriptionEndsAt);
  const [feedback, setFeedback] = useState<BillingFeedback>(null);

  // ── Renovar ──
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewMonths, setRenewMonths] = useState<RenewalMonths>(1);
  const [renewPlanId, setRenewPlanId] = useState("");
  // Cada apertura vuelve a pedir la cotización (el vencimiento o los extras pueden haber cambiado).
  const [renewNonce, setRenewNonce] = useState(0);
  const [renewSubmitError, setRenewSubmitError] = useState<string | null>(null);
  const [renewBusy, setRenewBusy] = useState(false);
  const renewQuery = new URLSearchParams({ months: String(renewMonths), ...(renewPlanId ? { planId: renewPlanId } : {}) }).toString();
  const renewFetch = useKeyedFetch<RenewalQuoteResponse>(
    renewOpen ? `${renewNonce}|${renewQuery}` : null,
    `/api/customer-account/renewal?${renewQuery}`,
  );

  const openRenew = useCallback((planId?: string) => {
    setRenewPlanId(planId ?? "");
    setRenewMonths(1);
    setRenewSubmitError(null);
    setRenewNonce((n) => n + 1);
    setRenewOpen(true);
  }, []);

  const submitRenew = useCallback(async () => {
    setRenewBusy(true);
    setRenewSubmitError(null);
    const result = await requestJson<{ order: PaymentSummary; openOrderId?: string }>(
      "/api/customer-account/renewal",
      postJson({ months: renewMonths, planId: renewPlanId || undefined }),
    );
    setRenewBusy(false);
    if (!result.ok) {
      setRenewSubmitError(result.error);
      return;
    }
    setRenewOpen(false);
    onOrderCreated(result.data.order);
    void onRefresh();
  }, [renewMonths, renewPlanId, onOrderCreated, onRefresh]);

  // ── Cambiar de plan ──
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [targetPlanId, setTargetPlanId] = useState("");
  const [planNonce, setPlanNonce] = useState(0);
  const [planSubmitError, setPlanSubmitError] = useState<string | null>(null);
  const [planBusy, setPlanBusy] = useState(false);
  const planFetch = useKeyedFetch<{ preview: PlanChangePreview }>(
    planDialogOpen && targetPlanId ? `${planNonce}|${targetPlanId}` : null,
    `/api/customer-account/plan-change?${new URLSearchParams({ targetPlanId })}`,
  );
  const planPreview = planFetch.data?.preview ?? null;

  const openPlanChange = useCallback((planId?: string) => {
    setTargetPlanId(planId ?? "");
    setPlanSubmitError(null);
    setPlanNonce((n) => n + 1);
    setPlanDialogOpen(true);
  }, []);

  const selectTargetPlan = useCallback((planId: string) => {
    setTargetPlanId(planId);
    setPlanSubmitError(null);
  }, []);

  const submitPlanChange = useCallback(async () => {
    if (!planPreview) return;
    setPlanBusy(true);
    setPlanSubmitError(null);
    const result = await requestJson<{ message?: string; order?: PaymentSummary; applied?: boolean }>(
      "/api/customer-account/plan-change",
      postJson({ targetPlanId: planPreview.targetPlan.id }),
    );
    setPlanBusy(false);
    if (!result.ok) {
      setPlanSubmitError(result.error);
      return;
    }
    setPlanDialogOpen(false);
    if (result.data.order) {
      onOrderCreated(result.data.order);
    } else {
      setFeedback({ tone: "success", message: result.data.message ?? "Listo." });
    }
    await onRefresh();
  }, [planPreview, onOrderCreated, onRefresh]);

  /** Vencida: el cambio de plan es una renovación con otro plan. */
  const renewWithPlan = useCallback(
    (planId: string) => {
      setPlanDialogOpen(false);
      openRenew(planId);
    },
    [openRenew],
  );

  // ── Cambio programado ──
  const [cancelScheduleBusy, setCancelScheduleBusy] = useState(false);
  const cancelScheduledChange = useCallback(async () => {
    setCancelScheduleBusy(true);
    const result = await requestJson<{ message?: string }>("/api/customer-account/plan-change", { method: "DELETE" });
    setCancelScheduleBusy(false);
    setFeedback(result.ok ? { tone: "success", message: result.data.message ?? "Cambio anulado." } : { tone: "danger", message: result.error });
    if (result.ok) await onRefresh();
  }, [onRefresh]);

  // ── Cancelar / reactivar ──
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelAck, setCancelAck] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const openCancel = useCallback(() => {
    setCancelReason("");
    setCancelAck(false);
    setCancelError(null);
    setCancelOpen(true);
  }, []);

  const submitCancel = useCallback(async () => {
    setCancelBusy(true);
    setCancelError(null);
    const result = await requestJson<{ message?: string; subscriptionStatus?: string; subscriptionEndsAt?: string | null }>(
      "/api/customer-account/cancel-subscription",
      postJson({ reason: cancelReason }),
    );
    setCancelBusy(false);
    if (!result.ok) {
      setCancelError(result.error);
      return;
    }
    setCancelOpen(false);
    onSubscriptionChange(result.data.subscriptionStatus ?? "cancelled", result.data.subscriptionEndsAt ?? subscriptionEndsAt);
    setFeedback({ tone: "info", message: result.data.message ?? "Cancelación programada." });
    await onRefresh();
  }, [cancelReason, onRefresh, onSubscriptionChange, subscriptionEndsAt]);

  const [reactivateBusy, setReactivateBusy] = useState(false);
  const reactivate = useCallback(async () => {
    setReactivateBusy(true);
    const result = await requestJson<{ message?: string; subscriptionStatus?: string; subscriptionEndsAt?: string | null }>(
      "/api/customer-account/reactivate-subscription",
      { method: "POST" },
    );
    setReactivateBusy(false);
    if (!result.ok) {
      setFeedback({ tone: "danger", message: result.error });
      return;
    }
    onSubscriptionChange(result.data.subscriptionStatus ?? "active", result.data.subscriptionEndsAt ?? subscriptionEndsAt);
    setFeedback({ tone: "success", message: result.data.message ?? "Suscripción reactivada." });
    await onRefresh();
  }, [onRefresh, onSubscriptionChange, subscriptionEndsAt]);

  return {
    phase,
    feedback,
    setFeedback,
    onOpenOrder,
    renew: {
      open: renewOpen,
      setOpen: setRenewOpen,
      months: renewMonths,
      setMonths: setRenewMonths,
      planId: renewPlanId,
      setPlanId: setRenewPlanId,
      // Mientras recotiza (otro plazo u otro plan) se ve la cotización anterior, atenuada.
      quote: renewFetch.data ?? (renewFetch.loading ? renewFetch.stale : null),
      loading: renewFetch.loading,
      error: renewSubmitError ?? renewFetch.error,
      busy: renewBusy,
      openRenew,
      submit: submitRenew,
    },
    planChange: {
      open: planDialogOpen,
      setOpen: setPlanDialogOpen,
      targetPlanId,
      setTargetPlanId: selectTargetPlan,
      preview: planPreview,
      loading: planFetch.loading,
      error: planSubmitError ?? planFetch.error,
      busy: planBusy,
      openPlanChange,
      submit: submitPlanChange,
      renewWithPlan,
    },
    schedule: { busy: cancelScheduleBusy, cancel: cancelScheduledChange },
    cancellation: {
      open: cancelOpen,
      setOpen: setCancelOpen,
      reason: cancelReason,
      setReason: setCancelReason,
      ack: cancelAck,
      setAck: setCancelAck,
      busy: cancelBusy,
      error: cancelError,
      openCancel,
      submit: submitCancel,
    },
    reactivation: { busy: reactivateBusy, reactivate },
  };
}

export type SubscriptionBilling = ReturnType<typeof useSubscriptionBilling>;

/** Contratar un extra: vista previa del servidor y creación del pedido. */
export function useAddonPurchase(params: {
  onRefresh: () => Promise<void>;
  onOrderCreated: (order: PaymentSummary) => void;
  onApplied: (message: string) => void;
}) {
  const { onRefresh, onOrderCreated, onApplied } = params;
  const [open, setOpen] = useState(false);
  const [addonId, setAddonId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [nonce, setNonce] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const query = new URLSearchParams({ addonId, quantity: String(quantity) }).toString();
  const previewFetch = useKeyedFetch<{ preview: AddonPurchasePreview }>(
    open && addonId ? `${nonce}|${query}` : null,
    `/api/customer-account/addons?${query}`,
    200,
  );
  const stalePreview = previewFetch.loading ? previewFetch.stale?.preview : null;
  const preview = previewFetch.data?.preview ?? (stalePreview?.addon.id === addonId ? stalePreview : null);

  const openAddon = useCallback((id: string) => {
    setAddonId(id);
    setQuantity(1);
    setSubmitError(null);
    setNonce((n) => n + 1);
    setOpen(true);
  }, []);

  const submit = useCallback(async () => {
    if (!preview) return;
    setBusy(true);
    setSubmitError(null);
    const result = await requestJson<{ order?: PaymentSummary; message?: string }>(
      "/api/customer-account/addons",
      postJson({ addonId: preview.addon.id, quantity: preview.quantity }),
    );
    setBusy(false);
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setOpen(false);
    if (result.data.order) onOrderCreated(result.data.order);
    else onApplied(result.data.message ?? "Extra activado.");
    await onRefresh();
  }, [preview, onOrderCreated, onApplied, onRefresh]);

  const blocked = useMemo(() => preview?.impacts.some((impact) => impact.level === "block") ?? false, [preview]);

  return {
    open,
    setOpen,
    addonId,
    quantity,
    setQuantity,
    preview,
    loading: previewFetch.loading,
    error: submitError ?? previewFetch.error,
    busy,
    blocked,
    openAddon,
    submit,
  };
}

export type AddonPurchase = ReturnType<typeof useAddonPurchase>;
