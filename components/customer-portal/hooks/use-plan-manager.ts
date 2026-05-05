"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActiveAddon,
  AddonOption,
  AddonPurchasePreview,
  PlanChangePreview,
  PlanOption,
} from "../shared/customer-account-types";
import { normalizeAddonIdentity, isSingleInstanceAddon } from "../shared/customer-account-addon-utils";
import { resolveAddonOfferForPlan } from "@/lib/plans/plan-offer-rules";

export type UsePlanManagerReturn = {
  // Plan change
  targetPlanId:              string;
  setTargetPlanId:           (id: string) => void;
  planMonths:                string;
  setPlanMonths:             (v: string) => void;
  planMonthsNumber:          number;
  planMethodSlug:            string;
  setPlanMethodSlug:         (v: string) => void;
  planReason:                string;
  setPlanReason:             (v: string) => void;
  planPreview:               PlanChangePreview | null;
  planPreviewLoading:        boolean;
  planChangeBusy:            boolean;
  acknowledgedImpactIds:     string[];
  setAcknowledgedImpactIds:  React.Dispatch<React.SetStateAction<string[]>>;
  selectedPlanOption:        PlanOption | null;
  recommendedPlanOption:     PlanOption | null;
  selectedPlanMethodOption:  PlanChangePreview["paymentMethods"][number] | null;
  planMonthlyDelta:          number | null;
  planAnnualDelta:           number | null;
  planFeedbackError:         string | null;
  planFeedbackOk:            string | null;
  handlePlanRequest:         () => Promise<void>;
  clearPlanFeedback:         () => void;

  // Cancel / reactivate
  subscriptionCancelReason:      string;
  setSubscriptionCancelReason:   (v: string) => void;
  subscriptionCancelBusy:        boolean;
  subscriptionCancelError:       string | null;
  subscriptionCancelOk:          string | null;
  subscriptionCancelModalOpen:   boolean;
  setSubscriptionCancelModalOpen:(v: boolean) => void;
  subscriptionCancelAcknowledge: boolean;
  setSubscriptionCancelAcknowledge:(v: boolean) => void;
  subscriptionCancelFinalConfirm:  boolean;
  setSubscriptionCancelFinalConfirm:(v: boolean) => void;
  subscriptionReactivateBusy:    boolean;
  cancellationScheduled:         boolean;
  canReactivateCancellation:     boolean;
  handleCancelSubscription:      () => Promise<void>;
  handleReactivateSubscription:  () => Promise<void>;

  // Addons
  targetAddonId:              string;
  setTargetAddonId:           (id: string) => void;
  addonQty:                   string;
  setAddonQty:                (v: string) => void;
  addonMonths:                string;
  setAddonMonths:             (v: string) => void;
  addonMonthsNumber:          number;
  addonMethodSlug:            string;
  setAddonMethodSlug:         (v: string) => void;
  addonNotes:                 string;
  setAddonNotes:              (v: string) => void;
  addonPreview:               AddonPurchasePreview | null;
  addonPreviewLoading:        boolean;
  addonPurchaseBusy:          boolean;
  acknowledgedAddonImpactIds: string[];
  setAcknowledgedAddonImpactIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedAddonOption:        AddonOption | null;
  ownedAddonKeys:             Set<string>;
  selectedAddonOwned:         boolean;
  selectedAddonSingleInstance:boolean;
  selectedAddonEffectiveQty:  number;
  selectedAddonIsMonthly:     boolean;
  selectedAddonModeLabel:     string;
  selectedAddonMethodOption:  AddonPurchasePreview["paymentMethods"][number] | null;
  addonEstimatedUnit:         number | null;
  addonEstimatedTotal:        number | null;
  addonOfferMatrix:           Array<{ addon: AddonOption; cells: Array<{ planId: string; decision: ReturnType<typeof resolveAddonOfferForPlan> }> }>;
  handleAddonRequest:         () => Promise<void>;
};

export function usePlanManager(
  availablePlans:   PlanOption[],
  availableAddons:  AddonOption[],
  activeAddonRows:  ActiveAddon[],
  activeBranchesCount: number,
  subscriptionEndsAt:  string | null,
  subscriptionStatus:  string | null,
  onRefreshSnapshot: () => Promise<void>,
  onSubscriptionStatusChange: (status: string, endsAt: string | null) => void,
): UsePlanManagerReturn {
  // ── Plan state ──
  const [targetPlanId,          setTargetPlanId]          = useState(availablePlans[0]?.id ?? "");
  const [planMonths,            setPlanMonths]            = useState("1");
  const [planMethodSlug,        setPlanMethodSlug]        = useState("");
  const [planReason,            setPlanReason]            = useState("");
  const [planPreview,           setPlanPreview]           = useState<PlanChangePreview | null>(null);
  const [planPreviewLoading,    setPlanPreviewLoading]    = useState(false);
  const [planChangeBusy,        setPlanChangeBusy]        = useState(false);
  const [acknowledgedImpactIds, setAcknowledgedImpactIds] = useState<string[]>([]);
  const [planFeedbackError,     setPlanFeedbackError]     = useState<string | null>(null);
  const [planFeedbackOk,        setPlanFeedbackOk]        = useState<string | null>(null);

  // ── Cancel state ──
  const [subscriptionCancelReason,       setSubscriptionCancelReason]        = useState("");
  const [subscriptionCancelBusy,         setSubscriptionCancelBusy]          = useState(false);
  const [subscriptionCancelError,        setSubscriptionCancelError]         = useState<string | null>(null);
  const [subscriptionCancelOk,           setSubscriptionCancelOk]            = useState<string | null>(null);
  const [subscriptionCancelModalOpen,    setSubscriptionCancelModalOpen]     = useState(false);
  const [subscriptionCancelAcknowledge,  setSubscriptionCancelAcknowledge]   = useState(false);
  const [subscriptionCancelFinalConfirm, setSubscriptionCancelFinalConfirm]  = useState(false);
  const [subscriptionReactivateBusy,     setSubscriptionReactivateBusy]      = useState(false);

  // ── Addon state ──
  const [targetAddonId,              setTargetAddonId]              = useState(availableAddons[0]?.id ?? "");
  const [addonQty,                   setAddonQty]                   = useState("1");
  const [addonMonths,                setAddonMonths]                = useState("1");
  const [addonMethodSlug,            setAddonMethodSlug]            = useState("");
  const [addonNotes,                 setAddonNotes]                 = useState("");
  const [addonPreview,               setAddonPreview]               = useState<AddonPurchasePreview | null>(null);
  const [addonPreviewLoading,        setAddonPreviewLoading]        = useState(false);
  const [addonPurchaseBusy,          setAddonPurchaseBusy]          = useState(false);
  const [acknowledgedAddonImpactIds, setAcknowledgedAddonImpactIds] = useState<string[]>([]);

  // ── Derived values ──
  const planMonthsNumber = Math.max(1, Math.min(24, Number.parseInt(planMonths, 10) || 1));

  const selectedPlanOption = useMemo(
    () => availablePlans.find((p) => p.id === targetPlanId) ?? null,
    [availablePlans, targetPlanId]
  );

  const recommendedPlanOption = useMemo(() => {
    if (!availablePlans.length) return null;
    const eligible = availablePlans.filter((p) => p.max_branches == null || p.max_branches >= activeBranchesCount);
    const pool = eligible.length > 0 ? eligible : availablePlans;
    return [...pool].sort((a, b) => (Number(a.price ?? Infinity)) - (Number(b.price ?? Infinity)))[0] ?? null;
  }, [availablePlans, activeBranchesCount]);

  const selectedPlanMethodOption =
    planPreview?.paymentMethods.find((m) => m.slug === planMethodSlug) ??
    planPreview?.paymentMethods[0] ?? null;

  const planMonthlyDelta = planPreview?.pricing.monthlyDiff ??
    (selectedPlanOption?.price != null && typeof selectedPlanOption?.price === "number" ? null : null);

  const planAnnualDelta = planMonthlyDelta != null ? Number((planMonthlyDelta * 12).toFixed(2)) : null;

  const expiryDays = (() => {
    if (!subscriptionEndsAt) return null;
    const end = new Date(subscriptionEndsAt).getTime();
    if (Number.isNaN(end)) return null;
    return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  })();

  const normalizedStatus = String(subscriptionStatus ?? "").trim().toLowerCase();
  const cancellationScheduled   = normalizedStatus === "cancelled" && expiryDays != null && expiryDays > 0;
  const canReactivateCancellation = cancellationScheduled;

  // ── Addon derived ──
  const ownedAddonKeys = useMemo(() => new Set(
    activeAddonRows
      .filter((a) => String(a.status ?? "").toLowerCase() === "active")
      .map((a) => normalizeAddonIdentity({ id: a.addonId, slug: a.addonSlug, type: a.addonType, name: a.addonName }))
  ), [activeAddonRows]);

  const selectedAddonOption = useMemo(
    () => availableAddons.find((a) => a.id === targetAddonId) ?? null,
    [availableAddons, targetAddonId]
  );

  const selectedAddonOwned = selectedAddonOption != null && ownedAddonKeys.has(
    normalizeAddonIdentity({ id: selectedAddonOption.id, name: selectedAddonOption.name, type: selectedAddonOption.type })
  );

  const selectedAddonSingleInstance = isSingleInstanceAddon(selectedAddonOption ?? {});
  const addonMonthsNumber           = Math.max(1, Math.min(24, Number.parseInt(addonMonths, 10) || 1));
  const selectedAddonEffectiveQty   = selectedAddonSingleInstance ? 1 : Math.max(1, Number.parseInt(addonQty, 10) || 1);
  const selectedAddonIsMonthly      = addonPreview?.pricing.isMonthly ?? (selectedAddonOption != null && Number(selectedAddonOption.price_monthly ?? 0) > 0);
  const selectedAddonModeLabel      = selectedAddonIsMonthly ? "Mensual co-terminado" : "Pago unico";
  const addonEstimatedUnit          = selectedAddonOption?.price_monthly ?? selectedAddonOption?.price_one_time ?? null;
  const addonEstimatedTotal         = addonEstimatedUnit != null
    ? addonEstimatedUnit * selectedAddonEffectiveQty * (selectedAddonOption?.price_monthly ? addonMonthsNumber : 1)
    : null;
  const selectedAddonMethodOption   =
    addonPreview?.paymentMethods.find((m) => m.slug === addonMethodSlug) ??
    addonPreview?.paymentMethods[0] ?? null;

  const addonOfferMatrix = useMemo(() => availableAddons.map((addon) => ({
    addon,
    cells: availablePlans.map((plan) => ({
      planId:   plan.id,
      decision: resolveAddonOfferForPlan(
        { id: plan.id, name: plan.name, max_branches: plan.max_branches, max_users: plan.max_users, features: plan.features, marketing_lines: plan.marketing_lines },
        { id: addon.id, slug: addon.slug ?? null, name: addon.name, type: addon.type, description: addon.description }
      ),
    })),
  })), [availableAddons, availablePlans]);

  // Keep qty = "1" for single-instance addons
  useEffect(() => {
    if (selectedAddonSingleInstance && addonQty !== "1") setAddonQty("1");
  }, [selectedAddonSingleInstance, addonQty]);

  const clearPlanFeedback = useCallback(() => {
    setPlanFeedbackError(null);
    setPlanFeedbackOk(null);
  }, []);

  const loadPlanPreview = useCallback(async () => {
    if (!targetPlanId) { setPlanPreview(null); return; }
    setPlanPreviewLoading(true);
    try {
      const sp  = new URLSearchParams({ targetPlanId, months: String(planMonthsNumber) });
      const res = await fetch(`/api/customer-account/plan-change?${sp}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; preview?: PlanChangePreview };
      if (!res.ok || !data.preview) {
        setPlanPreview(null);
        if (data.error && !data.error.toLowerCase().includes("ya estas en ese plan")) setPlanFeedbackError(data.error);
        return;
      }
      setPlanPreview(data.preview);
      setAcknowledgedImpactIds([]);
      setPlanMethodSlug((cur) => {
        if (cur && data.preview?.paymentMethods.some((m) => m.slug === cur)) return cur;
        return data.preview?.paymentMethods[0]?.slug ?? "";
      });
    } finally {
      setPlanPreviewLoading(false);
    }
  }, [targetPlanId, planMonthsNumber]);

  useEffect(() => { void loadPlanPreview(); }, [loadPlanPreview]);

  const loadAddonPreview = useCallback(async () => {
    if (!targetAddonId) { setAddonPreview(null); return; }
    setAddonPreviewLoading(true);
    try {
      const sp  = new URLSearchParams({ addonId: targetAddonId, quantity: String(selectedAddonEffectiveQty), months: String(addonMonthsNumber) });
      const res = await fetch(`/api/customer-account/addons?${sp}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { error?: string; preview?: AddonPurchasePreview };
      if (!res.ok || !data.preview) {
        setAddonPreview(null);
        if (data.error) setPlanFeedbackError(data.error);
        return;
      }
      setAddonPreview(data.preview);
      setAcknowledgedAddonImpactIds([]);
      setAddonMethodSlug((cur) => {
        if (cur && data.preview?.paymentMethods.some((m) => m.slug === cur)) return cur;
        return data.preview?.paymentMethods[0]?.slug ?? "";
      });
    } finally {
      setAddonPreviewLoading(false);
    }
  }, [targetAddonId, selectedAddonEffectiveQty, addonMonthsNumber]);

  useEffect(() => { void loadAddonPreview(); }, [loadAddonPreview]);

  const handlePlanRequest = async () => {
    if (!planPreview?.targetPlan?.id) { setPlanFeedbackError("No se pudo preparar el cambio de plan."); return; }
    if (planPreview.impacts.some((i) => i.level === "block")) { setPlanFeedbackError("Este cambio no se puede aplicar aun. Revisa los bloqueos indicados."); return; }
    const warnIds = planPreview.impacts.filter((i) => i.level === "warn").map((i) => i.id);
    if (!warnIds.every((id) => acknowledgedImpactIds.includes(id))) { setPlanFeedbackError("Debes confirmar todos los avisos antes de continuar."); return; }
    if (planPreview.pricing.requiresPayment && !planMethodSlug) { setPlanFeedbackError("Selecciona un metodo de pago para continuar."); return; }

    clearPlanFeedback();
    setPlanChangeBusy(true);
    try {
      const res  = await fetch("/api/customer-account/plan-change", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetPlanId, months: planMonthsNumber, methodSlug: planPreview.pricing.requiresPayment ? planMethodSlug : undefined, acceptedImpactIds: acknowledgedImpactIds }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; appliedNow?: boolean };
      if (!res.ok) { setPlanFeedbackError(data.error || "No se pudo aplicar el cambio de plan."); return; }
      setPlanFeedbackOk(data.message || (data.appliedNow ? "Plan actualizado correctamente." : "Pago creado. El cambio se aplicara cuando validemos el pago."));
      setPlanReason("");
      await loadPlanPreview();
      await onRefreshSnapshot();
    } finally { setPlanChangeBusy(false); }
  };

  const handleAddonRequest = async () => {
    if (!addonPreview?.addon?.id) { setPlanFeedbackError("No se pudo preparar la compra del extra."); return; }
    if (addonPreview.impacts.some((i) => i.level === "block")) { setPlanFeedbackError("Este extra no se puede comprar ahora. Revisa los bloqueos indicados."); return; }
    const warnIds = addonPreview.impacts.filter((i) => i.level === "warn").map((i) => i.id);
    if (!warnIds.every((id) => acknowledgedAddonImpactIds.includes(id))) { setPlanFeedbackError("Debes confirmar todos los avisos antes de continuar."); return; }
    if (addonPreview.pricing.requiresPayment && !addonMethodSlug) { setPlanFeedbackError("Selecciona un metodo de pago para continuar."); return; }

    clearPlanFeedback();
    setAddonPurchaseBusy(true);
    try {
      const res  = await fetch("/api/customer-account/addons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addonId: targetAddonId, quantity: selectedAddonEffectiveQty, months: addonMonthsNumber, methodSlug: addonPreview.pricing.requiresPayment ? addonMethodSlug : undefined, notes: addonNotes.trim() || undefined, acceptedImpactIds: acknowledgedAddonImpactIds }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; appliedNow?: boolean };
      if (!res.ok) { setPlanFeedbackError(data.error || "No se pudo procesar la compra del extra."); return; }
      setPlanFeedbackOk(data.message || (data.appliedNow ? "Extra activado correctamente." : "Pago creado. El extra se activara cuando validemos el pago."));
      setAddonNotes(""); setAddonQty("1"); setAddonMonths("1");
      await loadAddonPreview();
      await onRefreshSnapshot();
    } finally { setAddonPurchaseBusy(false); }
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionEndsAt) { setSubscriptionCancelError("No pudimos determinar la fecha de vencimiento de tu plan."); return; }
    setSubscriptionCancelError(null); setSubscriptionCancelOk(null);
    setSubscriptionCancelBusy(true);
    try {
      const res  = await fetch("/api/customer-account/cancel-subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: subscriptionCancelReason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; subscriptionStatus?: string; subscriptionEndsAt?: string | null };
      if (!res.ok) { setSubscriptionCancelError(data.error || "No se pudo programar la cancelacion."); return; }
      onSubscriptionStatusChange(data.subscriptionStatus ?? "cancelled", data.subscriptionEndsAt ?? subscriptionEndsAt);
      setSubscriptionCancelOk(data.message || "Tu suscripcion quedo cancelada.");
      setSubscriptionCancelReason("");
      setSubscriptionCancelModalOpen(false);
      setSubscriptionCancelAcknowledge(false);
      setSubscriptionCancelFinalConfirm(false);
      await onRefreshSnapshot();
    } finally { setSubscriptionCancelBusy(false); }
  };

  const handleReactivateSubscription = async () => {
    setSubscriptionCancelError(null); setSubscriptionCancelOk(null);
    setSubscriptionReactivateBusy(true);
    try {
      const res  = await fetch("/api/customer-account/reactivate-subscription", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; subscriptionStatus?: string; subscriptionEndsAt?: string | null };
      if (!res.ok) { setSubscriptionCancelError(data.error || "No se pudo reactivar la suscripcion."); return; }
      onSubscriptionStatusChange(data.subscriptionStatus ?? "active", data.subscriptionEndsAt ?? subscriptionEndsAt);
      setSubscriptionCancelOk(data.message || "Suscripcion reactivada correctamente.");
      await onRefreshSnapshot();
    } finally { setSubscriptionReactivateBusy(false); }
  };

  return {
    targetPlanId, setTargetPlanId, planMonths, setPlanMonths, planMonthsNumber,
    planMethodSlug, setPlanMethodSlug, planReason, setPlanReason,
    planPreview, planPreviewLoading, planChangeBusy,
    acknowledgedImpactIds, setAcknowledgedImpactIds,
    selectedPlanOption, recommendedPlanOption, selectedPlanMethodOption,
    planMonthlyDelta, planAnnualDelta,
    planFeedbackError, planFeedbackOk, handlePlanRequest, clearPlanFeedback,
    subscriptionCancelReason, setSubscriptionCancelReason,
    subscriptionCancelBusy, subscriptionCancelError, subscriptionCancelOk,
    subscriptionCancelModalOpen, setSubscriptionCancelModalOpen,
    subscriptionCancelAcknowledge, setSubscriptionCancelAcknowledge,
    subscriptionCancelFinalConfirm, setSubscriptionCancelFinalConfirm,
    subscriptionReactivateBusy, cancellationScheduled, canReactivateCancellation,
    handleCancelSubscription, handleReactivateSubscription,
    targetAddonId, setTargetAddonId, addonQty, setAddonQty, addonMonths, setAddonMonths, addonMonthsNumber,
    addonMethodSlug, setAddonMethodSlug, addonNotes, setAddonNotes,
    addonPreview, addonPreviewLoading, addonPurchaseBusy,
    acknowledgedAddonImpactIds, setAcknowledgedAddonImpactIds,
    selectedAddonOption, ownedAddonKeys, selectedAddonOwned, selectedAddonSingleInstance,
    selectedAddonEffectiveQty, selectedAddonIsMonthly, selectedAddonModeLabel,
    selectedAddonMethodOption, addonEstimatedUnit, addonEstimatedTotal,
    addonOfferMatrix, handleAddonRequest,
  };
}
