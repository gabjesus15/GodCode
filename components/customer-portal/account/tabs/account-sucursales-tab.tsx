"use client";

import { useState } from "react";
import { Edit, MapPin, Minus, Plus, Store } from "lucide-react";

import type { BranchFlow } from "../../hooks/use-branch-flow";
import { branchEntitlementStatusLabel, fmtDay, fmtUsd } from "../../shared/customer-account-format";
import type { BillingOptionsResponse, BranchEntitlementSummary, BranchSummary, CompanySnapshot } from "../../shared/customer-account-types";
import { Alert } from "../../ui/Alert";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";
import { Dialog, DialogFooter } from "../../ui/Dialog";
import { EmptyState } from "../../ui/EmptyState";
import { PageHeader } from "../../ui/PageHeader";
import { StatCard } from "../../ui/StatCard";
import { BranchEditModal } from "./branch-edit-modal";

export type AccountSucursalesTabProps = {
  company: CompanySnapshot;
  branches: BranchSummary[];
  billingOptions: BillingOptionsResponse | null;
  billingLoading: boolean;
  activeBranchesCount: number;
  branchEntitlements: BranchEntitlementSummary[];
  branchFlow: BranchFlow;
};

const inputClass =
  "h-10 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

function BranchWizard({ company, branchFlow }: Pick<AccountSucursalesTabProps, "company" | "branchFlow">) {
  const flow = branchFlow;
  return (
    <Dialog
      open={flow.open}
      onOpenChange={flow.setOpen}
      title={flow.withPayment ? "Agregar sucursal (cupo extra)" : "Solicitar nueva sucursal"}
      description={
        flow.withPayment
          ? "Tu plan ya usa todas sus sucursales: suma un cupo extra y la creamos por ti."
          : "Tu plan tiene cupo: envíanos los datos y la creamos por ti."
      }
      size="md"
    >
      <ol className="mb-5 flex items-center gap-2 text-xs font-medium" aria-label="Pasos">
        {["Datos", flow.withPayment ? "Pago" : "Confirmar"].map((label, index) => {
          const current = flow.step === index + 1;
          const done = flow.step > index + 1;
          return (
            <li key={label} className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  done ? "bg-emerald-500 text-white" : current ? "bg-indigo-600 text-white" : "bg-[#f5f5f7] text-[#a1a1a6]"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {index + 1}
              </span>
              <span className={current ? "text-[#1d1d1f]" : "text-[#a1a1a6]"}>{label}</span>
              {index === 0 && <span className="h-px w-8 bg-[#e5e5ea]" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {flow.step === 1 ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="branch-name" className="mb-1.5 block text-xs font-medium text-[#6e6e73]">
              Nombre de la sucursal <span className="text-red-500">*</span>
            </label>
            <input id="branch-name" value={flow.name} onChange={(e) => flow.setName(e.target.value)} placeholder="Ej. Sucursal Norte" maxLength={120} className={inputClass} />
          </div>
          <div>
            <label htmlFor="branch-address" className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Dirección (opcional)</label>
            <input id="branch-address" value={flow.address} onChange={(e) => flow.setAddress(e.target.value)} placeholder="Calle y número" maxLength={200} className={inputClass} />
          </div>
          <div>
            <label htmlFor="branch-notes" className="mb-1.5 block text-xs font-medium text-[#6e6e73]">Notas para el equipo (opcional)</label>
            <textarea
              id="branch-notes"
              value={flow.notes}
              onChange={(e) => flow.setNotes(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Horario, teléfono, lo que necesitemos saber."
              className="w-full resize-none rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      ) : flow.withPayment ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[#1d1d1f]">Cupos extra</span>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" aria-label="Menos" disabled={flow.quantity <= 1} onClick={() => flow.setQuantity(flow.quantity - 1)}>
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold tabular-nums">{flow.quantity}</span>
              <Button variant="secondary" size="sm" aria-label="Más" disabled={flow.quantity >= 10} onClick={() => flow.setQuantity(flow.quantity + 1)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          {flow.quote && flow.amount != null ? (
            <div className="rounded-xl bg-[#fbfbfd] px-4 py-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-[#1d1d1f]">Hoy pagas</span>
                <span className="text-xl font-semibold tabular-nums text-[#1d1d1f]">{fmtUsd(flow.amount, company.locale)}</span>
              </div>
              <p className="mt-1 text-xs text-[#6e6e73]">
                {flow.unitMonthly != null ? `Cada cupo cuesta ${fmtUsd(flow.unitMonthly, company.locale)}/mes. ` : ""}
                Hoy pagas los {flow.quote.remainingDays} días hasta tu vencimiento ({fmtDay(flow.quote.coversUntil, company.timezone)}); después
                se suma a cada renovación.
              </p>
              {flow.projectedMax != null && (
                <p className="mt-2 text-xs text-[#6e6e73]">
                  Quedarás con {flow.activeBranchesCount + 1} de {flow.projectedMax} sucursales.
                </p>
              )}
            </div>
          ) : (
            <Alert variant="warning">Renueva tu plan para poder sumar sucursales extra.</Alert>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-[#fbfbfd] px-4 py-3 text-sm">
            <p className="font-medium text-[#1d1d1f]">{flow.name}</p>
            {flow.address && <p className="mt-0.5 text-[#6e6e73]">{flow.address}</p>}
          </div>
          <p className="text-sm text-[#6e6e73]">Nuestro equipo crea la sucursal y te avisa por Soporte (normalmente en un día hábil).</p>
        </div>
      )}

      {flow.error && <Alert variant="danger" className="mt-4">{flow.error}</Alert>}

      <DialogFooter>
        {flow.step === 2 ? (
          <Button variant="secondary" onClick={flow.back} disabled={flow.busy}>Atrás</Button>
        ) : (
          <Button variant="secondary" onClick={() => flow.setOpen(false)}>Cancelar</Button>
        )}
        {flow.step === 1 ? (
          <Button onClick={flow.next}>Continuar</Button>
        ) : (
          <Button loading={flow.busy} disabled={flow.withPayment && !flow.quote} onClick={() => void flow.submit()}>
            {flow.withPayment ? "Continuar al pago" : "Enviar solicitud"}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}

export function AccountSucursalesTab({
  company,
  branches,
  billingOptions,
  billingLoading,
  activeBranchesCount,
  branchEntitlements,
  branchFlow,
}: AccountSucursalesTabProps) {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedBranchForEdit, setSelectedBranchForEdit] = useState<BranchSummary | null>(null);

  // Con cada refresco del servidor la sucursal abierta se actualiza sola.
  const branchToEdit = selectedBranchForEdit
    ? (branches.find((b) => b.id === selectedBranchForEdit.id) ?? selectedBranchForEdit)
    : null;

  const maxBranches = billingOptions?.effectiveMaxBranches ?? billingOptions?.maxBranches ?? null;
  const unlimited = maxBranches == null || maxBranches >= 999;
  const usedPct = !unlimited && maxBranches ? Math.min(100, Math.round((activeBranchesCount / maxBranches) * 100)) : null;
  const extras = billingOptions?.extraBranchEntitlements ?? 0;
  const phase = billingOptions?.phase;
  const canAdd = phase !== "expired" && phase !== "payment_pending";

  return (
    <div className="space-y-5 sm:space-y-6">
      <PageHeader title="Sucursales" description="Tus puntos de venta y el cupo de tu plan." />

      {branchFlow.ok && (
        <Alert variant="success" onDismiss={() => branchFlow.setOk(null)}>{branchFlow.ok}</Alert>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-3">
        <StatCard label="Sucursales activas" value={activeBranchesCount} icon={Store} accent="indigo" />
        <StatCard
          label="Cupo del plan"
          value={unlimited ? "Ilimitado" : maxBranches}
          sub={extras > 0 ? `Incluye ${extras} ${extras === 1 ? "cupo extra" : "cupos extra"}` : undefined}
          icon={Store}
          accent="emerald"
        />
        {usedPct != null && (
          <StatCard
            label="Cupo usado"
            value={`${usedPct}%`}
            sub={`${activeBranchesCount} de ${maxBranches}`}
            icon={Store}
            accent={usedPct >= 100 ? "amber" : "sky"}
          />
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1d1d1f]">Tus sucursales</p>
            {billingOptions?.requiresPaymentForExpansion && (
              <p className="mt-0.5 text-xs text-[#6e6e73]">Usaste todo el cupo: una sucursal más necesita un cupo extra.</p>
            )}
          </div>
          <Button
            size="sm"
            className="w-full justify-center sm:w-auto"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={branchFlow.openWizard}
            loading={billingLoading && !billingOptions}
            disabled={!canAdd}
            title={canAdd ? undefined : "Renueva tu plan para agregar sucursales"}
          >
            Agregar sucursal
          </Button>
        </div>

        {branches.length === 0 ? (
          <EmptyState icon={Store} title="Sin sucursales" description="Todavía no tienes sucursales en tu cuenta." />
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBranchForEdit(branch);
                      setEditModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                  >
                    <Edit className="h-3 w-3" aria-hidden /> Editar
                  </button>
                  {company.tenantAdminUrl ? (
                    <a href={company.tenantAdminUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 hover:underline">
                      Abrir panel
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {branchEntitlements.length > 0 && (
        <Card noPadding>
          <p className="px-4 pt-4 text-sm font-semibold text-[#1d1d1f] sm:px-5">Cupos extra</p>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[30rem] text-sm">
              <thead className="bg-[#fbfbfd]">
                <tr>
                  {["Cupos", "Pagado", "Estado", "Vence"].map((header) => (
                    <th key={header} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-[#a1a1a6] sm:px-5 sm:text-xs">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f5f7]">
                {branchEntitlements.map((entitlement) => (
                  <tr key={entitlement.id}>
                    <td className="px-4 py-3 font-medium text-[#1d1d1f] sm:px-5">{entitlement.quantity}</td>
                    <td className="px-4 py-3 tabular-nums text-[#6e6e73] sm:px-5">{fmtUsd(entitlement.amountPaid, company.locale)}</td>
                    <td className="px-4 py-3 sm:px-5">
                      <Badge variant={String(entitlement.status).toLowerCase() === "active" ? "success" : "neutral"}>
                        {branchEntitlementStatusLabel(entitlement.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[#6e6e73] sm:px-5">
                      {String(entitlement.status).toLowerCase() === "active" ? fmtDay(entitlement.expiresAt, company.timezone) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <BranchWizard company={company} branchFlow={branchFlow} />

      <BranchEditModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        branch={branchToEdit}
        onSaveSuccess={() => {
          // router.refresh() dentro del modal actualiza `branches` desde el servidor.
        }}
      />
    </div>
  );
}
