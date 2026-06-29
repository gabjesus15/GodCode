"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { AlertTriangle, Check, ChevronRight, Package, X } from "lucide-react";

import type { AddonOfferDecision } from "@/lib/plans/plan-offer-rules";
import { normalizeAddonIdentity } from "../../shared/customer-account-addon-utils";
import { branchEntitlementStatusLabel, fmtDate, formatPaymentConfigKey, fmtMoney } from "../../shared/customer-account-format";
import type {
  ActiveAddon,
  AddonOption,
  AddonPurchasePreview,
  BillingMethodOption,
  BranchEntitlementSummary,
  CompanySnapshot,
  PlanChangePreview,
  PlanOption,
} from "../../shared/customer-account-types";

import { Alert } from "../../ui/Alert";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Dialog, DialogFooter } from "../../ui/Dialog";
import { EmptyState } from "../../ui/EmptyState";
import { PageHeader } from "../../ui/PageHeader";

export type AccountPlanAddonMatrixRow = {
  addon: AddonOption;
  cells: Array<{ planId: string; decision: AddonOfferDecision }>;
};

export type AccountPlanTabProps = {
  company: CompanySnapshot;
  recommendedPlanOption: PlanOption | null;
  targetPlanId: string;
  setTargetPlanId: (id: string) => void;
  planMonthlyDelta: number | null;
  planAnnualDelta: number | null;
  setPlanMonths: (v: string) => void;
  activeAddonRows: ActiveAddon[];
  subscriptionEndsAt: string | null;
  subscriptionCancelReason: string;
  setSubscriptionCancelReason: (v: string) => void;
  subscriptionCancelError: string | null;
  subscriptionCancelOk: string | null;
  subscriptionCancelBusy: boolean;
  cancellationScheduled: boolean;
  subscriptionReactivateBusy: boolean;
  setSubscriptionCancelAcknowledge: (v: boolean) => void;
  setSubscriptionCancelFinalConfirm: (v: boolean) => void;
  setSubscriptionCancelModalOpen: (v: boolean) => void;
  canReactivateCancellation: boolean;
  handleReactivateSubscription: () => void;
  addonOfferMatrix: AccountPlanAddonMatrixRow[];
  availablePlans: PlanOption[];
  planPreview: PlanChangePreview | null;
  planPreviewLoading: boolean;
  selectedPlanOption: PlanOption | null;
  planMonths: string;
  planMethodSlug: string;
  setPlanMethodSlug: (v: string) => void;
  selectedPlanMethodOption: BillingMethodOption | null;
  planReason: string;
  setPlanReason: (v: string) => void;
  handlePlanRequest: () => void;
  planChangeBusy: boolean;
  acknowledgedImpactIds: string[];
  setAcknowledgedImpactIds: Dispatch<SetStateAction<string[]>>;
  availableAddons: AddonOption[];
  targetAddonId: string;
  setTargetAddonId: (v: string) => void;
  ownedAddonKeys: Set<string>;
  selectedAddonOption: AddonOption | null;
  selectedAddonModeLabel: string;
  selectedAddonSingleInstance: boolean;
  selectedAddonOwned: boolean;
  addonPreview: AddonPurchasePreview | null;
  addonPreviewLoading: boolean;
  addonQty: string;
  setAddonQty: (v: string) => void;
  selectedAddonEffectiveQty: number;
  addonMonthsNumber: number;
  addonMonths: string;
  setAddonMonths: (v: string) => void;
  selectedAddonIsMonthly: boolean;
  addonMethodSlug: string;
  setAddonMethodSlug: (v: string) => void;
  selectedAddonMethodOption: BillingMethodOption | null;
  addonEstimatedUnit: number | null;
  addonEstimatedTotal: number | null;
  addonNotes: string;
  setAddonNotes: (v: string) => void;
  handleAddonRequest: () => void;
  addonPurchaseBusy: boolean;
  acknowledgedAddonImpactIds: string[];
  setAcknowledgedAddonImpactIds: Dispatch<SetStateAction<string[]>>;
  branchEntitlements: BranchEntitlementSummary[];
  planFeedbackError?: string | null;
  planFeedbackOk?: string | null;
  clearPlanFeedback?: () => void;
};

// ─── Plan change dialog ───────────────────────────────────────────────────────

type PlanDialogProps = Pick<AccountPlanTabProps,
  "company" | "availablePlans" | "planPreview" | "planPreviewLoading" |
  "selectedPlanOption" | "targetPlanId" | "setTargetPlanId" |
  "planMonths" | "setPlanMonths" |
  "planMethodSlug" | "setPlanMethodSlug" | "selectedPlanMethodOption" |
  "planReason" | "setPlanReason" |
  "planChangeBusy" | "acknowledgedImpactIds" | "setAcknowledgedImpactIds" |
  "handlePlanRequest"
> & { open: boolean; onClose: () => void };

function PlanChangeDialog({ open, onClose, company, availablePlans, planPreview, planPreviewLoading, selectedPlanOption: _selectedPlanOption, targetPlanId, setTargetPlanId, planMonths, setPlanMonths, planMethodSlug, setPlanMethodSlug, selectedPlanMethodOption, planReason, setPlanReason, planChangeBusy, acknowledgedImpactIds, setAcknowledgedImpactIds, handlePlanRequest }: PlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }} title="Cambiar plan" description="Compara opciones y confirma el cambio." size="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Plan objetivo</label>
          <select
            value={targetPlanId}
            onChange={(e) => setTargetPlanId(e.target.value)}
            className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {availablePlans.map((p) => <option key={p.id} value={p.id}>{p.name} — {fmtMoney(p.price, company.currency, company.locale)}/mes</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Meses a pagar</label>
            <input type="number" min={1} max={24} value={planMonths} onChange={(e) => setPlanMonths(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          {planPreview?.pricing.requiresPayment ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Metodo de pago</label>
              <select value={planMethodSlug} onChange={(e) => setPlanMethodSlug(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                {planPreview.paymentMethods.map((m) => <option key={m.id} value={m.slug}>{m.name}</option>)}
              </select>
            </div>
          ) : (
            <div className="flex items-end pb-0.5">
              <div className="flex h-10 w-full items-center gap-1.5 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] px-3 text-xs text-[#6e6e73]">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Sin costo adicional
              </div>
            </div>
          )}
        </div>

        {planPreviewLoading && <div className="h-16 animate-pulse rounded-xl bg-[#f5f5f7]" />}

        {!planPreviewLoading && planPreview && (
          <>
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#fbfbfd] p-3 text-sm">
              <div><p className="text-xs text-[#a1a1a6]">Actual</p><p className="font-semibold text-[#1d1d1f]">{planPreview.currentPlan?.name ?? company.planName ?? "-"}</p><p className="text-xs text-[#6e6e73]">{fmtMoney(planPreview.pricing.currentPrice, company.currency, company.locale)}/mes</p></div>
              <div className="flex items-center justify-center"><ChevronRight className="h-4 w-4 text-[#d2d2d7]" /></div>
              <div><p className="text-xs text-[#a1a1a6]">Objetivo</p><p className="font-semibold text-[#1d1d1f]">{planPreview.targetPlan.name}</p><p className="text-xs text-[#6e6e73]">{fmtMoney(planPreview.pricing.targetPrice, company.currency, company.locale)}/mes</p></div>
            </div>

            {planPreview.execution?.mode === "scheduled_cycle_end" && (
              <Alert variant="info">El downgrade se aplicara al cierre del ciclo. Fecha efectiva: {fmtDate(planPreview.execution.effectiveAt, company.timezone)}</Alert>
            )}

            {planPreview.impacts.length > 0 && (
              <div className="space-y-2">
                {planPreview.impacts.map((impact) => (
                  <div key={impact.id} className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${impact.level === "block" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    {impact.level === "block" ? <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#1d1d1f]">{impact.title}</p>
                      <p className="text-xs text-[#6e6e73]">{impact.detail}</p>
                    </div>
                    {impact.level === "warn" && (
                      <input type="checkbox" checked={acknowledgedImpactIds.includes(impact.id)} onChange={(e) => setAcknowledgedImpactIds((prev) => e.target.checked ? [...prev, impact.id] : prev.filter((id) => id !== impact.id))} className="mt-0.5 h-4 w-4 rounded accent-indigo-600" aria-label={`Confirmar: ${impact.title}`} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {selectedPlanMethodOption && planPreview.pricing.requiresPayment && Object.keys(selectedPlanMethodOption.config).length > 0 && (
              <div className="rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] p-3 text-xs text-[#6e6e73]">
                <p className="font-semibold text-[#1d1d1f]">{selectedPlanMethodOption.name}</p>
                {Object.entries(selectedPlanMethodOption.config).map(([k, v]) => <p key={k}><span className="font-medium">{formatPaymentConfigKey(k)}:</span> {v}</p>)}
              </div>
            )}

            <div className="rounded-xl bg-[#fbfbfd] p-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-[#6e6e73]">Pago ahora</span><span className="font-semibold text-[#1d1d1f]">{fmtMoney(planPreview.pricing.amountDue, company.currency, company.locale)}</span></div>
              <div className="flex items-center justify-between mt-1"><span className="text-[#6e6e73]">Nuevo precio mensual</span><span className="font-semibold text-[#1d1d1f]">{fmtMoney(planPreview.pricing.targetPrice, company.currency, company.locale)}</span></div>
            </div>
          </>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Motivo (opcional)</label>
          <textarea value={planReason} onChange={(e) => setPlanReason(e.target.value)} rows={2} placeholder="Cuéntanos por qué cambias de plan…" className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={planChangeBusy} onClick={handlePlanRequest} disabled={planPreviewLoading || planPreview?.impacts.some((i) => i.level === "block")}>
          {planPreview?.pricing.requiresPayment ? "Confirmar y pagar" : "Confirmar cambio"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ─── Addon purchase dialog ─────────────────────────────────────────────────────

type AddonDialogProps = Pick<AccountPlanTabProps,
  "company" | "availableAddons" | "addonPreview" | "addonPreviewLoading" |
  "selectedAddonOption" | "targetAddonId" | "setTargetAddonId" |
  "addonQty" | "setAddonQty" | "selectedAddonEffectiveQty" | "selectedAddonSingleInstance" |
  "addonMonths" | "setAddonMonths" | "addonMonthsNumber" |
  "addonMethodSlug" | "setAddonMethodSlug" | "selectedAddonMethodOption" |
  "addonNotes" | "setAddonNotes" |
  "addonPurchaseBusy" | "acknowledgedAddonImpactIds" | "setAcknowledgedAddonImpactIds" |
  "handleAddonRequest" | "selectedAddonIsMonthly" | "selectedAddonModeLabel" |
  "addonEstimatedUnit" | "addonEstimatedTotal" | "selectedAddonOwned"
> & { open: boolean; onClose: () => void };

function AddonPurchaseDialog({ open, onClose, company, availableAddons, addonPreview, addonPreviewLoading, selectedAddonOption, targetAddonId, setTargetAddonId, addonQty, setAddonQty, selectedAddonEffectiveQty: _selectedAddonEffectiveQty, selectedAddonSingleInstance, addonMonths, setAddonMonths, addonMethodSlug, setAddonMethodSlug, selectedAddonMethodOption, addonNotes, setAddonNotes, addonPurchaseBusy, acknowledgedAddonImpactIds, setAcknowledgedAddonImpactIds, handleAddonRequest, selectedAddonIsMonthly, selectedAddonModeLabel, addonEstimatedTotal: _addonEstimatedTotal, selectedAddonOwned }: AddonDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }} title="Comprar extra" description="Selecciona el extra, cantidad y metodo de pago." size="lg">
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Extra</label>
          <select value={targetAddonId} onChange={(e) => setTargetAddonId(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
            {availableAddons.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          {selectedAddonOption?.description && <p className="mt-1 text-xs text-[#6e6e73]">{selectedAddonOption.description}</p>}
        </div>

        {selectedAddonOwned && <Alert variant="info">Ya tienes este extra activo.</Alert>}

        <div className="grid grid-cols-2 gap-3">
          {!selectedAddonSingleInstance && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Cantidad</label>
              <input type="number" min={1} value={addonQty} onChange={(e) => setAddonQty(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          )}
          {selectedAddonIsMonthly && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Meses</label>
              <input type="number" min={1} max={24} value={addonMonths} onChange={(e) => setAddonMonths(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
            </div>
          )}
        </div>

        {addonPreviewLoading && <div className="h-16 animate-pulse rounded-xl bg-[#f5f5f7]" />}

        {!addonPreviewLoading && addonPreview && (
          <>
            {addonPreview.impacts.length > 0 && (
              <div className="space-y-2">
                {addonPreview.impacts.map((impact) => (
                  <div key={impact.id} className={`flex items-start gap-2.5 rounded-xl border p-3 text-sm ${impact.level === "block" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
                    {impact.level === "block" ? <X className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                    <div className="min-w-0 flex-1"><p className="font-medium text-[#1d1d1f]">{impact.title}</p><p className="text-xs text-[#6e6e73]">{impact.detail}</p></div>
                    {impact.level === "warn" && <input type="checkbox" checked={acknowledgedAddonImpactIds.includes(impact.id)} onChange={(e) => setAcknowledgedAddonImpactIds((prev) => e.target.checked ? [...prev, impact.id] : prev.filter((id) => id !== impact.id))} className="mt-0.5 h-4 w-4 rounded accent-indigo-600" />}
                  </div>
                ))}
              </div>
            )}

            {addonPreview.pricing.requiresPayment && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Metodo de pago</label>
                <select value={addonMethodSlug} onChange={(e) => setAddonMethodSlug(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                  {addonPreview.paymentMethods.map((m) => <option key={m.id} value={m.slug}>{m.name}</option>)}
                </select>
                {selectedAddonMethodOption && Object.keys(selectedAddonMethodOption.config).length > 0 && (
                  <div className="mt-2 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] p-3 text-xs text-[#6e6e73]">
                    {Object.entries(selectedAddonMethodOption.config).map(([k, v]) => <p key={k}><span className="font-medium">{formatPaymentConfigKey(k)}:</span> {v}</p>)}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-xl bg-[#fbfbfd] p-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-[#6e6e73]">Modalidad</span><span className="font-medium text-[#1d1d1f]">{selectedAddonModeLabel}</span></div>
              <div className="flex items-center justify-between mt-1"><span className="text-[#6e6e73]">Total</span><span className="font-semibold text-[#1d1d1f]">{fmtMoney(addonPreview.pricing.amountDue, company.currency, company.locale)}</span></div>
            </div>
          </>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Notas (opcional)</label>
          <textarea value={addonNotes} onChange={(e) => setAddonNotes(e.target.value)} rows={2} className="w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm resize-none focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
        </div>
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" loading={addonPurchaseBusy} onClick={handleAddonRequest} disabled={addonPreviewLoading || addonPreview?.impacts.some((i) => i.level === "block") || selectedAddonOwned}>
          {addonPreview?.pricing.requiresPayment ? "Confirmar y pagar" : "Activar extra"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function AccountPlanTab(props: AccountPlanTabProps) {
  const {
    company, recommendedPlanOption, targetPlanId, setTargetPlanId,
    planMonthlyDelta, planAnnualDelta, setPlanMonths,
    activeAddonRows, subscriptionEndsAt,
    subscriptionCancelError, subscriptionCancelOk,
    subscriptionCancelBusy, cancellationScheduled,
    subscriptionReactivateBusy,
    setSubscriptionCancelAcknowledge, setSubscriptionCancelFinalConfirm, setSubscriptionCancelModalOpen,
    canReactivateCancellation, handleReactivateSubscription,
    availablePlans, availableAddons,
    planPreview, planPreviewLoading, selectedPlanOption, planMonths, planMethodSlug, setPlanMethodSlug,
    selectedPlanMethodOption, planReason, setPlanReason, handlePlanRequest,
    planChangeBusy, acknowledgedImpactIds, setAcknowledgedImpactIds,
    targetAddonId, setTargetAddonId, ownedAddonKeys, selectedAddonOption,
    selectedAddonModeLabel, selectedAddonSingleInstance, selectedAddonOwned,
    addonPreview, addonPreviewLoading, setAddonQty, selectedAddonEffectiveQty,
    addonMonthsNumber, addonMonths, setAddonMonths, selectedAddonIsMonthly,
    addonMethodSlug, setAddonMethodSlug, selectedAddonMethodOption,
    addonEstimatedUnit, addonEstimatedTotal, addonNotes, setAddonNotes,
    handleAddonRequest, addonPurchaseBusy, acknowledgedAddonImpactIds, setAcknowledgedAddonImpactIds,
    branchEntitlements, planFeedbackError, planFeedbackOk, clearPlanFeedback,
  } = props;

  const [planDialogOpen,  setPlanDialogOpen]  = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [addonQtyLocal, setAddonQtyLocal] = useState("1");

  const handleOpenAddonDialog = (addonId: string) => {
    setTargetAddonId(addonId);
    setAddonQtyLocal("1");
    setAddonQty("1");
    setAddonDialogOpen(true);
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Plan y extras" description="Gestiona tu suscripcion, extras y historial de capacidad." />

      {planFeedbackOk && (
        <Alert variant="success" onDismiss={clearPlanFeedback}>{planFeedbackOk}</Alert>
      )}
      {planFeedbackError && (
        <Alert variant="danger" onDismiss={clearPlanFeedback}>{planFeedbackError}</Alert>
      )}

      {/* Alerts */}
      {cancellationScheduled && (
        <Alert variant="info" title="Cancelacion programada">
          Tu acceso se mantiene hasta {fmtDate(subscriptionEndsAt, company.timezone)}. Puedes reactivar antes de esa fecha.
          {canReactivateCancellation && (
            <div className="mt-2">
              <Button variant="secondary" size="sm" loading={subscriptionReactivateBusy} onClick={handleReactivateSubscription}>
                Reactivar suscripcion
              </Button>
            </div>
          )}
        </Alert>
      )}
      {subscriptionCancelOk && <Alert variant="success">{subscriptionCancelOk}</Alert>}
      {subscriptionCancelError && <Alert variant="danger">{subscriptionCancelError}</Alert>}

      {/* Plan card */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Plan contratado</p>
            <h3 className="mt-1 text-lg font-semibold text-[#1d1d1f]">{company.planName ?? "Sin plan"}</h3>
            <p className="text-sm text-[#6e6e73]">{fmtMoney(company.planPrice, company.currency, company.locale)} / mes · vence {fmtDate(subscriptionEndsAt, company.timezone)}</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button variant="secondary" size="sm" className="w-full justify-center sm:w-auto" onClick={() => setPlanDialogOpen(true)}>
              Cambiar plan
            </Button>
            {!cancellationScheduled && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSubscriptionCancelAcknowledge(false); setSubscriptionCancelFinalConfirm(false); setSubscriptionCancelModalOpen(true); }}
                disabled={subscriptionCancelBusy}
                className="w-full justify-center text-red-600 hover:bg-red-50 sm:w-auto"
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {/* Plan comparison strip */}
        {(planMonthlyDelta != null || recommendedPlanOption) && (
          <div className="mt-5 grid grid-cols-1 gap-3 rounded-xl bg-[#fbfbfd] p-3.5 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
            <div><p className="text-xs text-[#a1a1a6]">Plan actual</p><p className="font-semibold text-[#1d1d1f]">{company.planName ?? "-"}</p></div>
            <div><p className="text-xs text-[#a1a1a6]">Recomendado</p><p className="font-semibold text-[#1d1d1f]">{recommendedPlanOption?.name ?? "-"}</p></div>
            <div><p className="text-xs text-[#a1a1a6]">Impacto mensual</p><p className={`font-semibold ${planMonthlyDelta != null && planMonthlyDelta > 0 ? "text-amber-600" : planMonthlyDelta != null && planMonthlyDelta < 0 ? "text-emerald-600" : "text-[#1d1d1f]"}`}>{planMonthlyDelta != null ? fmtMoney(planMonthlyDelta, company.currency, company.locale) : "-"}</p></div>
            <div><p className="text-xs text-[#a1a1a6]">Proyeccion anual</p><p className={`font-semibold ${planAnnualDelta != null && planAnnualDelta > 0 ? "text-amber-600" : planAnnualDelta != null && planAnnualDelta < 0 ? "text-emerald-600" : "text-[#1d1d1f]"}`}>{planAnnualDelta != null ? fmtMoney(planAnnualDelta, company.currency, company.locale) : "-"}</p></div>
          </div>
        )}

        {/* Active addons summary */}
        {activeAddonRows.length > 0 && (
          <div className="mt-5 border-t border-[#f5f5f7] pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#a1a1a6]">Extras activos</p>
            <div className="flex flex-wrap gap-2">
              {activeAddonRows.map((addon) => (
                <Badge key={addon.id} variant={String(addon.status ?? "").toLowerCase() === "active" ? "success" : "neutral"} dot>
                  {addon.addonName}
                  {addon.expires_at && <span className="ml-1 opacity-60">· hasta {fmtDate(addon.expires_at, company.timezone)}</span>}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Extras catalog */}
      <div>
        <PageHeader title="Extras disponibles" description="Amplia las funcionalidades de tu plan con servicios adicionales." />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {availableAddons.length === 0 ? (
            <EmptyState icon={Package} title="Sin extras disponibles" description="No hay servicios adicionales disponibles para tu plan." className="col-span-full" />
          ) : availableAddons.map((addon) => {
            const ownedKey = normalizeAddonIdentity({ id: addon.id, name: addon.name, type: addon.type });
            const isOwned  = ownedAddonKeys.has(ownedKey);
            const price    = addon.price_monthly ?? addon.price_one_time;
            return (
              <Card key={addon.id} compact className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[#1d1d1f]">{addon.name}</p>
                    {addon.description && <p className="mt-0.5 text-xs text-[#6e6e73]">{addon.description}</p>}
                  </div>
                  {isOwned ? <Badge variant="success" dot>Activo</Badge> : <Badge variant="neutral">Disponible</Badge>}
                </div>
                <div className="flex flex-col gap-2 border-t border-[#f5f5f7] pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-[#1d1d1f]">
                    {price != null ? `${fmtMoney(price, company.currency, company.locale)}${addon.price_monthly ? "/mes" : " unico"}` : "Gratis"}
                  </p>
                  <Button
                    variant={isOwned ? "ghost" : "primary"}
                    size="sm"
                    className="w-full justify-center sm:w-auto"
                    onClick={() => handleOpenAddonDialog(addon.id)}
                    disabled={isOwned && isSingleInstanceAddon(addon)}
                  >
                    {isOwned ? "Renovar" : "Contratar"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Branch entitlements */}
      {branchEntitlements.length > 0 && (
        <div>
          <PageHeader title="Historial de capacidad de sucursales" />
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#e5e5ea]">
            <table className="w-full text-sm">
              <thead className="bg-[#fbfbfd]">
                <tr>
                  {["Cantidad", "Meses", "Monto", "Estado", "Expira"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.1em] text-[#a1a1a6]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f7]">
                {branchEntitlements.map((e) => (
                  <tr key={e.id} className="hover:bg-[#fbfbfd]">
                    <td className="px-4 py-3 font-medium text-[#1d1d1f]">{e.quantity}</td>
                    <td className="px-4 py-3 text-[#6e6e73]">{e.monthsPurchased}</td>
                    <td className="px-4 py-3 text-[#6e6e73]">{fmtMoney(e.amountPaid, company.currency, company.locale)}</td>
                    <td className="px-4 py-3"><Badge variant={String(e.status ?? "").toLowerCase() === "active" ? "success" : "neutral"}>{branchEntitlementStatusLabel(e.status)}</Badge></td>
                    <td className="px-4 py-3 text-[#6e6e73]">{fmtDate(e.expiresAt, company.timezone)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <PlanChangeDialog
        open={planDialogOpen}
        onClose={() => setPlanDialogOpen(false)}
        company={company}
        availablePlans={availablePlans}
        planPreview={planPreview}
        planPreviewLoading={planPreviewLoading}
        selectedPlanOption={selectedPlanOption}
        targetPlanId={targetPlanId}
        setTargetPlanId={setTargetPlanId}
        planMonths={planMonths}
        setPlanMonths={setPlanMonths}
        planMethodSlug={planMethodSlug}
        setPlanMethodSlug={setPlanMethodSlug}
        selectedPlanMethodOption={selectedPlanMethodOption}
        planReason={planReason}
        setPlanReason={setPlanReason}
        planChangeBusy={planChangeBusy}
        acknowledgedImpactIds={acknowledgedImpactIds}
        setAcknowledgedImpactIds={setAcknowledgedImpactIds}
        handlePlanRequest={handlePlanRequest}
      />

      <AddonPurchaseDialog
        open={addonDialogOpen}
        onClose={() => setAddonDialogOpen(false)}
        company={company}
        availableAddons={availableAddons}
        addonPreview={addonPreview}
        addonPreviewLoading={addonPreviewLoading}
        selectedAddonOption={selectedAddonOption}
        targetAddonId={targetAddonId}
        setTargetAddonId={setTargetAddonId}
        addonQty={addonQtyLocal}
        setAddonQty={(v) => { setAddonQtyLocal(v); setAddonQty(v); }}
        selectedAddonEffectiveQty={selectedAddonEffectiveQty}
        selectedAddonSingleInstance={selectedAddonSingleInstance}
        addonMonths={addonMonths}
        setAddonMonths={setAddonMonths}
        addonMonthsNumber={addonMonthsNumber}
        addonMethodSlug={addonMethodSlug}
        setAddonMethodSlug={setAddonMethodSlug}
        selectedAddonMethodOption={selectedAddonMethodOption}
        addonNotes={addonNotes}
        setAddonNotes={setAddonNotes}
        addonPurchaseBusy={addonPurchaseBusy}
        acknowledgedAddonImpactIds={acknowledgedAddonImpactIds}
        setAcknowledgedAddonImpactIds={setAcknowledgedAddonImpactIds}
        handleAddonRequest={handleAddonRequest}
        selectedAddonIsMonthly={selectedAddonIsMonthly}
        selectedAddonModeLabel={selectedAddonModeLabel}
        addonEstimatedUnit={addonEstimatedUnit}
        addonEstimatedTotal={addonEstimatedTotal}
        selectedAddonOwned={selectedAddonOwned}
      />
    </div>
  );
}

function isSingleInstanceAddon(addon: { name?: string | null; slug?: string | null; type?: string | null }): boolean {
  const h = `${String(addon.name ?? "")} ${String(addon.slug ?? "")} ${String(addon.type ?? "")}`.toLowerCase();
  return h.includes("dominio") || h.includes("domain") || h.includes("custom_domain") || h.includes("custom-domain");
}
