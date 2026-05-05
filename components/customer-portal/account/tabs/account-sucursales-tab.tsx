"use client";

import { useState } from "react";
import { MapPin, Plus, Store, Upload } from "lucide-react";
import type { BillingOptionsResponse, BillingPaymentResponse, BranchSummary, CompanySnapshot } from "../../shared/customer-account-types";
import { fmtMoney } from "../../shared/customer-account-format";
import { Alert } from "../../ui/Alert";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Dialog, DialogFooter } from "../../ui/Dialog";
import { EmptyState } from "../../ui/EmptyState";
import { PageHeader } from "../../ui/PageHeader";
import { StatCard } from "../../ui/StatCard";

export type AccountSucursalesTabProps = {
  company: CompanySnapshot;
  branches: BranchSummary[];
  billingLoading: boolean;
  canRequestBranchWithoutPayment: boolean;
  branchUnitPrice: number | null;
  branchFlowStep: 1 | 2 | 3;
  setBranchFlowStep: (step: 1 | 2 | 3) => void;
  isProjectedCapacityInvalid: boolean;
  setBillingError: (msg: string | null) => void;
  billingOptions: BillingOptionsResponse | null;
  activeBranchesCount: number;
  billingError: string | null;
  billingOk: string | null;
  branchRequestName: string;
  setBranchRequestName: (v: string) => void;
  expansionBranchName: string;
  setExpansionBranchName: (v: string) => void;
  branchRequestAddress: string;
  setBranchRequestAddress: (v: string) => void;
  expansionBranchAddress: string;
  setExpansionBranchAddress: (v: string) => void;
  expansionQty: string;
  setExpansionQty: (v: string) => void;
  expansionMonths: string;
  setExpansionMonths: (v: string) => void;
  expansionMethodSlug: string;
  setExpansionMethodSlug: (v: string) => void;
  projectedActiveBranches: number;
  projectedEffectiveMaxBranches: number | null | undefined;
  projectedRemainingBranches: number | null | undefined;
  expansionQtyNumber: number;
  expansionMonthsNumber: number;
  expansionAmount: number | null;
  branchRequestNotes: string;
  setBranchRequestNotes: (v: string) => void;
  expansionNotes: string;
  setExpansionNotes: (v: string) => void;
  busy: boolean;
  onBranchRequest: () => void;
  onCreateExpansionPayment: () => void;
  createdExpansionPayment: BillingPaymentResponse | null;
  proofUploading: boolean;
  proofFileUrl: string | null;
  onUploadPaymentProof: (file: File) => void;
  onBranchWizardBack: () => void;
  onBranchWizardNext: () => void;
};

type StepDotProps = { step: number; current: number; label: string };
function StepDot({ step, current, label }: StepDotProps) {
  const done   = step < current;
  const active = step === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${done ? "bg-emerald-500 text-white" : active ? "bg-indigo-600 text-white" : "bg-[#f5f5f7] text-[#a1a1a6]"}`}>
        {done ? "✓" : step}
      </div>
      <span className={`text-[10px] font-medium ${active ? "text-[#1d1d1f]" : "text-[#a1a1a6]"}`}>{label}</span>
    </div>
  );
}

type StepperProps = { step: number; withPayment: boolean };
function Stepper({ step, withPayment }: StepperProps) {
  const steps = withPayment
    ? [{ n: 1, label: "Datos" }, { n: 2, label: "Pago" }, { n: 3, label: "Listo" }]
    : [{ n: 1, label: "Datos" }, { n: 2, label: "Confirmar" }];
  return (
    <div className="mb-6 flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center">
          <StepDot step={s.n} current={step} label={s.label} />
          {i < steps.length - 1 && <div className={`mx-2 h-px w-10 ${step > s.n ? "bg-emerald-400" : "bg-[#e5e5ea]"}`} />}
        </div>
      ))}
    </div>
  );
}

export function AccountSucursalesTab({
  company,
  branches,
  billingLoading,
  canRequestBranchWithoutPayment,
  branchUnitPrice: _branchUnitPrice,
  branchFlowStep,
  setBranchFlowStep,
  isProjectedCapacityInvalid,
  billingOptions,
  activeBranchesCount,
  billingError,
  billingOk,
  branchRequestName,
  setBranchRequestName,
  expansionBranchName,
  setExpansionBranchName,
  branchRequestAddress,
  setBranchRequestAddress,
  expansionBranchAddress,
  setExpansionBranchAddress,
  expansionQty,
  setExpansionQty,
  expansionMonths,
  setExpansionMonths,
  expansionMethodSlug,
  setExpansionMethodSlug,
  projectedActiveBranches,
  projectedEffectiveMaxBranches,
  projectedRemainingBranches: _projectedRemainingBranches,
  expansionQtyNumber: _expansionQtyNumber,
  expansionMonthsNumber: _expansionMonthsNumber,
  expansionAmount,
  branchRequestNotes,
  setBranchRequestNotes,
  expansionNotes: _expansionNotes,
  setExpansionNotes: _setExpansionNotes,
  busy,
  onBranchRequest,
  onCreateExpansionPayment,
  createdExpansionPayment,
  proofUploading,
  proofFileUrl,
  onUploadPaymentProof,
  onBranchWizardBack,
  onBranchWizardNext,
}: AccountSucursalesTabProps) {
  const [wizardOpen, setWizardOpen] = useState(false);

  const maxBranches = billingOptions?.effectiveMaxBranches ?? billingOptions?.maxBranches ?? null;
  const usedPct     = maxBranches != null ? Math.min(100, Math.round((activeBranchesCount / maxBranches) * 100)) : null;
  const withPayment = !canRequestBranchWithoutPayment;

  const openWizard = () => { setBranchFlowStep(1); setWizardOpen(true); };
  const closeWizard = () => { setWizardOpen(false); setBranchFlowStep(1); };

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Sucursales" description="Administra tus puntos de venta y solicita expansion de capacidad." />

      {billingError && <Alert variant="danger">{billingError}</Alert>}
      {billingOk    && <Alert variant="success">{billingOk}</Alert>}

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
        <StatCard label="Sucursales activas" value={activeBranchesCount}   icon={Store}  accent="indigo" />
        <StatCard label="Limite del plan"    value={maxBranches ?? "Ilimitado"} icon={Store} accent="emerald" />
        {maxBranches != null && (
          <StatCard label="Capacidad usada" value={`${usedPct ?? 0}%`} sub={`${activeBranchesCount} / ${maxBranches}`} icon={Store} accent={usedPct != null && usedPct >= 90 ? "amber" : "sky"} />
        )}
      </div>

      {/* Branch list */}
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-[#1d1d1f]">Tus sucursales</p>
          <Button
            variant="primary"
            size="sm"
            className="w-full justify-center sm:w-auto"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={openWizard}
            loading={billingLoading}
          >
            Agregar sucursal
          </Button>
        </div>

        {branches.length === 0 ? (
          <EmptyState icon={Store} title="Sin sucursales registradas" description="Aun no tienes sucursales en tu cuenta." />
        ) : (
          <div className="space-y-2">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="flex flex-col gap-3 rounded-xl border border-[#e5e5ea] p-3.5 transition hover:bg-[#fbfbfd] sm:flex-row sm:items-center sm:gap-3 sm:p-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                    <Store className="h-5 w-5 text-indigo-600" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-[#1d1d1f]">{branch.name}</p>
                    {branch.address && (
                      <p className="mt-0.5 flex items-start gap-1 text-xs leading-snug text-[#6e6e73]">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0" aria-hidden /> <span>{branch.address}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-[#f5f5f7] pt-3 sm:ml-auto sm:border-0 sm:pt-0">
                  <Badge variant={branch.is_active !== false ? "success" : "neutral"} dot>
                    {branch.is_active !== false ? "Activa" : "Inactiva"}
                  </Badge>
                  {company.tenantAdminUrl ? (
                    <a
                      href={company.tenantAdminUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Admin
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Wizard Dialog */}
      <Dialog
        open={wizardOpen}
        onOpenChange={(v) => { if (!v) closeWizard(); }}
        title={withPayment ? "Solicitar expansion de sucursal" : "Solicitar nueva sucursal"}
        size="md"
      >
        <Stepper step={branchFlowStep} withPayment={withPayment} />

        {/* Step 1: datos basicos */}
        {branchFlowStep === 1 && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Nombre de la sucursal <span className="text-red-500">*</span></label>
              <input
                value={withPayment ? expansionBranchName : branchRequestName}
                onChange={(e) => withPayment ? setExpansionBranchName(e.target.value) : setBranchRequestName(e.target.value)}
                placeholder="Ej. Sucursal Norte"
                className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Direccion (opcional)</label>
              <input
                value={withPayment ? expansionBranchAddress : branchRequestAddress}
                onChange={(e) => withPayment ? setExpansionBranchAddress(e.target.value) : setBranchRequestAddress(e.target.value)}
                placeholder="Calle y numero"
                className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {!withPayment && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Notas adicionales (opcional)</label>
                <textarea
                  value={branchRequestNotes}
                  onChange={(e) => setBranchRequestNotes(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2 con pago: configurar expansion */}
        {branchFlowStep === 2 && withPayment && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Cantidad de cupos</label>
                <input type="number" min={1} value={expansionQty} onChange={(e) => setExpansionQty(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Meses</label>
                <input type="number" min={1} value={expansionMonths} onChange={(e) => setExpansionMonths(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none" />
              </div>
            </div>

            {billingOptions?.paymentMethods && billingOptions.paymentMethods.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Metodo de pago</label>
                <select value={expansionMethodSlug} onChange={(e) => setExpansionMethodSlug(e.target.value)} className="h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none">
                  {billingOptions.paymentMethods.map((m) => <option key={m.id} value={m.slug}>{m.name}</option>)}
                </select>
              </div>
            )}

            <div className="rounded-xl bg-[#fbfbfd] p-3 text-sm">
              <div className="flex justify-between"><span className="text-[#6e6e73]">Total estimado</span><span className="font-semibold text-[#1d1d1f]">{fmtMoney(expansionAmount, company.currency, company.locale)}</span></div>
              <div className="flex justify-between mt-1"><span className="text-[#6e6e73]">Sucursales despues</span><span className="font-medium text-[#1d1d1f]">{projectedActiveBranches} / {projectedEffectiveMaxBranches ?? "∞"}</span></div>
              {isProjectedCapacityInvalid && <p className="mt-1 text-xs text-red-600">La proyeccion supera tu capacidad. Ajusta la cantidad.</p>}
            </div>
          </div>
        )}

        {/* Step 2 sin pago: confirmar */}
        {branchFlowStep === 2 && !withPayment && (
          <div className="space-y-3">
            <Alert variant="info">Un agente revisara tu solicitud y configurara la sucursal. Te notificaremos por correo.</Alert>
            <div className="rounded-xl bg-[#fbfbfd] p-3 text-sm">
              <p className="font-medium text-[#1d1d1f]">{branchRequestName}</p>
              {branchRequestAddress && <p className="text-[#6e6e73]">{branchRequestAddress}</p>}
            </div>
          </div>
        )}

        {/* Step 3: comprobante / completado */}
        {branchFlowStep === 3 && (
          <div className="space-y-4">
            <Alert variant="success" title="Orden de pago creada">
              {createdExpansionPayment?.instructions.summary.requiresManualProof
                ? "Sube el comprobante de pago para que podamos validarlo."
                : "El pago se aplicara automaticamente en breve."}
            </Alert>
            {createdExpansionPayment?.instructions.summary.requiresManualProof && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Comprobante de pago</label>
                <label className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[#d2d2d7] bg-[#fbfbfd] px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/20 ${proofUploading ? "pointer-events-none opacity-60" : ""}`}>
                  <Upload className="h-5 w-5 text-[#a1a1a6]" aria-hidden />
                  <span className="text-sm text-[#6e6e73]">{proofUploading ? "Subiendo…" : proofFileUrl ? "Cambiar comprobante" : "Seleccionar imagen"}</span>
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadPaymentProof(f); }} disabled={proofUploading} />
                </label>
                {proofFileUrl && <p className="mt-1 text-xs text-emerald-600">Comprobante cargado.</p>}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {branchFlowStep > 1 && branchFlowStep < 3 && (
            <Button variant="secondary" onClick={onBranchWizardBack} disabled={busy}>Atras</Button>
          )}
          {branchFlowStep < (withPayment ? 2 : 2) && (
            <Button variant="primary" onClick={onBranchWizardNext}>Continuar</Button>
          )}
          {branchFlowStep === 2 && withPayment && (
            <Button variant="primary" loading={busy} onClick={onCreateExpansionPayment} disabled={isProjectedCapacityInvalid}>Crear orden de pago</Button>
          )}
          {branchFlowStep === 2 && !withPayment && (
            <Button variant="primary" loading={busy} onClick={onBranchRequest}>Enviar solicitud</Button>
          )}
          {branchFlowStep === 3 && (
            <Button variant="secondary" onClick={closeWizard}>Cerrar</Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}
