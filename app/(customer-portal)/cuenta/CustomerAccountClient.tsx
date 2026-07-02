"use client";

import { useEffect, useMemo, useState } from "react";

import { CustomerAccountShell } from "@/components/customer-portal/shell/CustomerAccountShell";
import { CustomerAccountShellSkeleton } from "@/components/customer-portal/shell/CustomerAccountShellSkeleton";
import { SUBSCRIPTION_STATUS_LABELS, PAYMENT_STATUS_LABELS, TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from "@/components/customer-portal/shared/customer-account-constants";
import { displayStatus, fmtMoney, branchEntitlementStatusLabel } from "@/components/customer-portal/shared/customer-account-format";

import { useAccountSnapshot }  from "@/components/customer-portal/hooks/use-account-snapshot";
import { usePlanManager }      from "@/components/customer-portal/hooks/use-plan-manager";
import { useStoreTheme }       from "@/components/customer-portal/hooks/use-store-theme";
import { useBranchFlow }       from "@/components/customer-portal/hooks/use-branch-flow";
import { useBillingFilters }   from "@/components/customer-portal/hooks/use-billing-filters";
import { useTickets }          from "@/components/customer-portal/hooks/use-tickets";
import { useUnsavedGuard }     from "@/components/customer-portal/hooks/use-unsaved-guard";
import { useConfirmDialog }    from "@/components/customer-portal/ui/ConfirmDialog";

import { AccountResumenTab }    from "@/components/customer-portal/account/tabs/account-resumen-tab";
import { AccountPerfilPublicoTab } from "@/components/customer-portal/account/tabs/account-perfil-publico-tab";
import { AccountTiendaTab }     from "@/components/customer-portal/account/tabs/account-tienda-tab";
import { AccountPlanTab }       from "@/components/customer-portal/account/tabs/account-plan-tab";
import { AccountSucursalesTab } from "@/components/customer-portal/account/tabs/account-sucursales-tab";
import { AccountFacturacionTab } from "@/components/customer-portal/account/tabs/account-facturacion-tab";
import { AccountSoporteTab }    from "@/components/customer-portal/account/tabs/account-soporte-tab";
import { AccountSeguridadTab }  from "@/components/customer-portal/account/tabs/account-seguridad-tab";

import type {
  AccountActivityItem,
  CustomerAccountClientProps,
  PortalTab,
} from "@/components/customer-portal/shared/customer-account-types";

export type { CustomerAccountClientProps } from "@/components/customer-portal/shared/customer-account-types";

export function CustomerAccountClient(props: CustomerAccountClientProps) {
  const {
    company, branches, businessInfo, payments, activeAddons, availablePlans, availableAddons,
    initialTickets, initialBranchEntitlements, initialBillingOptions, initialSyncedAt,
  } = props;

  const [mounted,       setMounted]       = useState(false);
  const [tab,           setTab]           = useState<PortalTab>("resumen");
  const [activityFilter, setActivityFilter] = useState<"all" | "pago" | "ticket" | "extra">("all");
  const [billingOptions, setBillingOptions] = useState<import("@/components/customer-portal/shared/customer-account-types").BillingOptionsResponse | null>(initialBillingOptions ?? null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingLoadError, setBillingLoadError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Foundation hooks ────────────────────────────────────────────────────────

  const confirmDialog = useConfirmDialog();

  const snapshot = useAccountSnapshot(
    payments, initialTickets, initialBranchEntitlements, activeAddons,
    company.subscriptionStatus, company.subscriptionEndsAt,
    { enablePolling: tab !== "tienda" && tab !== "seguridad", companyId: company.id, initialSyncedAt },
  );

  const planManager = usePlanManager(
    availablePlans, availableAddons, snapshot.activeAddonRows,
    billingOptions?.activeBranchCount ?? branches.filter((b) => b.is_active !== false).length,
    snapshot.subscriptionEndsAt,
    snapshot.subscriptionStatus,
    () => snapshot.refresh("full"),
    (status, endsAt) => { snapshot.setSubscriptionStatus(status); snapshot.setSubscriptionEndsAt(endsAt); },
    { previewEnabled: tab === "plan" },
  );

  const storeTheme = useStoreTheme(
    () => confirmDialog.confirm({
      title:        "Descartar cambios",
      description:  "Se descartaran tus cambios y el borrador volvera al estado de produccion.",
      confirmLabel: "Descartar",
      tone:         "danger",
    })
  );

  const tickets = useTickets(snapshot.tickets, company);

  // Keep tickets in sync with snapshot
  useEffect(() => { tickets.setTickets(snapshot.tickets); }, [snapshot.tickets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to soporte tab from ticket hooks
  useEffect(() => {
    tickets.setOnNavigateToSupport(() => setTab("soporte"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canRequestBranchWithoutPayment = billingOptions?.requiresPaymentForExpansion === false;

  const branchFlow = useBranchFlow(
    company, billingOptions,
    billingOptions?.activeBranchCount ?? branches.filter((b) => b.is_active !== false).length,
    snapshot.subscriptionEndsAt,
    canRequestBranchWithoutPayment,
    (ticket) => tickets.setTickets((prev) => ticket ? [ticket, ...prev.filter((t) => t.id !== ticket.id)] : prev),
    (payment) => snapshot.setPaymentRows((prev) => [payment, ...prev]),
    (entitlement) => snapshot.setBranchEntitlements((prev) => [entitlement, ...prev]),
    async () => { await loadBillingOptions(); },
  );

  const billing = useBillingFilters(snapshot.paymentRows, company.currency, company.locale);

  const unsavedGuard = useUnsavedGuard(tab, storeTheme.storeThemeHasLocalUnsavedChanges, confirmDialog);

  // ── Billing options loader ──────────────────────────────────────────────────

  const loadBillingOptions = async () => {
    setBillingLoading(true);
    setBillingLoadError(null);
    try {
      const res  = await fetch("/api/customer-account/billing", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as import("@/components/customer-portal/shared/customer-account-types").BillingOptionsResponse & { error?: string };
      if (!res.ok) {
        setBillingLoadError(data.error || "No se pudo cargar opciones de facturacion.");
        return;
      }
      setBillingOptions(data);
      const cur = branchFlow.expansionMethodSlug;
      const next = cur && data.paymentMethods.some((m) => m.slug === cur)
        ? cur
        : data.paymentMethods[0]?.slug ?? "";
      branchFlow.setExpansionMethodSlug(next);
    } catch {
      setBillingLoadError("No se pudo cargar opciones de facturacion.");
    } finally { setBillingLoading(false); }
  };

  useEffect(() => {
    if ((tab === "plan" || tab === "sucursales") && !billingOptions && !billingLoading) {
      void loadBillingOptions();
    }
  }, [tab, billingOptions, billingLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track support tab for ticket polling
  useEffect(() => { tickets.setIsOnSupportTab(tab === "soporte"); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values shared across tabs ──────────────────────────────────────

  const activeBranchesCount   = billingOptions?.activeBranchCount ?? branches.filter((b) => b.is_active !== false).length;
  const openTicketsCount       = snapshot.tickets.filter((t) => ["open","in_progress","waiting_customer"].includes(t.status)).length;
  const latestPayment          = snapshot.paymentRows[0] ?? null;
  const activeEntitlementsCount = snapshot.branchEntitlements.filter((e) => String(e.status).toLowerCase() === "active").length;

  const expiryDays = (() => {
    if (!snapshot.subscriptionEndsAt) return null;
    const end = new Date(snapshot.subscriptionEndsAt).getTime();
    if (Number.isNaN(end)) return null;
    return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  })();

  const normalizedStatus     = String(snapshot.subscriptionStatus ?? "").trim().toLowerCase();
  const cancellationScheduled = normalizedStatus === "cancelled" && expiryDays != null && expiryDays > 0;

  const accountAlerts = useMemo(() => {
    const alerts: Array<{ id: string; tone: "warn" | "info" | "ok"; title: string; description: string }> = [];
    if (expiryDays != null && expiryDays <= 7) {
      alerts.push({ id: "subscription-expiry", tone: expiryDays <= 0 ? "warn" : "info", title: expiryDays <= 0 ? "Tu plan esta vencido" : "Tu plan vence pronto", description: expiryDays <= 0 ? "Regulariza tu suscripcion para evitar interrupciones en tus modulos activos." : `Te quedan ${expiryDays} dia${expiryDays === 1 ? "" : "s"}. Revisa facturacion para evitar cortes.` });
    }
    if (billing.pendingPaymentsCount > 0) {
      alerts.push({ id: "pending-payments", tone: "info", title: "Tienes pagos pendientes de validacion", description: `${billing.pendingPaymentsCount} pago${billing.pendingPaymentsCount === 1 ? "" : "s"} requiere${billing.pendingPaymentsCount === 1 ? "" : "n"} seguimiento.` });
    }
    if (billingOptions?.effectiveMaxBranches != null) {
      const remaining = billingOptions.effectiveMaxBranches - activeBranchesCount;
      if (remaining <= 1) alerts.push({ id: "branch-capacity", tone: remaining <= 0 ? "warn" : "info", title: remaining <= 0 ? "Llegaste al limite de sucursales" : "Te queda poco cupo de sucursales", description: remaining <= 0 ? "Para agregar una nueva sucursal debes comprar expansion desde esta misma cuenta." : `Te queda ${remaining} cupo disponible antes de requerir expansion.` });
    }
    if (alerts.length === 0) alerts.push({ id: "all-good", tone: "ok", title: "Tu cuenta esta al dia", description: "No hay alertas criticas por ahora." });
    return alerts;
  }, [expiryDays, billing.pendingPaymentsCount, billingOptions?.effectiveMaxBranches, activeBranchesCount]);

  const activityTimeline = useMemo(() => {
    const paymentItems: AccountActivityItem[] = snapshot.paymentRows.map((p) => ({ id: `p-${p.id}`, type: "pago", title: `Pago ${p.payment_reference ?? "sin referencia"}`, detail: `${fmtMoney(p.amount_paid, company.currency, company.locale)} · ${displayStatus(p.status, PAYMENT_STATUS_LABELS)}`, status: String(p.status ?? ""), occurredAt: p.payment_date ?? "", amount: p.amount_paid }));
    const ticketItems: AccountActivityItem[]  = snapshot.tickets.map((t) => ({ id: `t-${t.id}`, type: "ticket", title: t.subject, detail: `${displayStatus(t.status, TICKET_STATUS_LABELS)} · ${TICKET_CATEGORY_LABELS[t.category] ?? t.category}`, status: t.status, occurredAt: t.lastMessageAt || t.createdAt }));
    const entitlementItems: AccountActivityItem[] = snapshot.branchEntitlements.map((e) => ({ id: `e-${e.id}`, type: "extra", title: `Compra de ${e.quantity} sucursal(es) extra`, detail: `${fmtMoney(e.amountPaid, company.currency, company.locale)} · ${branchEntitlementStatusLabel(e.status)}`, status: e.status, occurredAt: e.createdAt, amount: e.amountPaid }));
    return [...paymentItems, ...ticketItems, ...entitlementItems].filter((i) => i.occurredAt).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 20);
  }, [snapshot.paymentRows, snapshot.tickets, snapshot.branchEntitlements, company]);

  const filteredActivityTimeline = useMemo(
    () =>
      activityFilter === "all"
        ? activityTimeline
        : activityTimeline.filter((item: AccountActivityItem) => item.type === activityFilter),
    [activityTimeline, activityFilter],
  );

  const handleTabChange = async (nextTab: PortalTab) => {
    await unsavedGuard.guardedTabChange(nextTab, setTab);
  };

  if (!mounted) return <CustomerAccountShellSkeleton />;

  return (
    <>
      {confirmDialog.ConfirmDialogNode}
      <CustomerAccountShell
        companyName={company.name}
        activeTab={tab}
        onTabChange={handleTabChange}
        subscriptionStatus={snapshot.subscriptionStatus}
        subscriptionStatusLabel={displayStatus(snapshot.subscriptionStatus, SUBSCRIPTION_STATUS_LABELS)}
        lastRealtimeSyncAt={snapshot.lastRealtimeSyncAt}
        isSyncing={snapshot.isSyncing}
        onManualRefresh={() => void snapshot.refresh("full")}
      >
        {tab === "resumen" && (
          <AccountResumenTab
            company={company}
            subscriptionStatus={snapshot.subscriptionStatus}
            subscriptionEndsAt={snapshot.subscriptionEndsAt}
            activeEntitlementsCount={activeEntitlementsCount}
            activeBranchesCount={activeBranchesCount}
            openTicketsCount={openTicketsCount}
            branches={branches}
            tickets={snapshot.tickets}
            latestPayment={latestPayment}
            accountAlerts={accountAlerts}
            expiryDays={expiryDays}
            cancellationScheduled={cancellationScheduled}
            filteredActivityTimeline={filteredActivityTimeline}
            activityFilter={activityFilter}
            setActivityFilter={setActivityFilter}
            onNavigate={handleTabChange}
          />
        )}

        {tab === "perfil" && (
          <AccountPerfilPublicoTab
            company={company}
            branches={branches}
            initialBusinessInfo={businessInfo}
            storeThemePublished={storeTheme.storeThemePublished}
            onNavigate={handleTabChange}
          />
        )}

        {tab === "tienda" && (
          <AccountTiendaTab
            company={company}
            publicationStateLabel={storeTheme.publicationStateLabel}
            storeThemeUpdatedAt={storeTheme.storeThemeUpdatedAt}
            storeThemeUpdatedBy={storeTheme.storeThemeUpdatedBy}
            latestPublishedVersion={storeTheme.latestPublishedVersion}
            storeThemeAutosaveStatus={storeTheme.storeThemeAutosaveStatus}
            storeThemeHasLocalUnsavedChanges={storeTheme.storeThemeHasLocalUnsavedChanges}
            storeThemeAutosaveError={storeTheme.storeThemeAutosaveError}
            storeThemeError={storeTheme.storeThemeError}
            storeThemeOk={storeTheme.storeThemeOk}
            storeThemeLoading={storeTheme.storeThemeLoading}
            storeThemeDraft={storeTheme.storeThemeDraft}
            setStoreThemeDraft={storeTheme.setStoreThemeDraft}
            restoreStoreThemeColorsFromProduction={storeTheme.restoreStoreThemeColorsFromProduction}
            storeThemeSaving={storeTheme.storeThemeSaving}
            storeThemePublishing={storeTheme.storeThemePublishing}
            storeThemePublished={storeTheme.storeThemePublished}
            storeThemeAssetLocalPreview={storeTheme.storeThemeAssetLocalPreview}
            storeThemeAssetUploading={storeTheme.storeThemeAssetUploading}
            storeThemeAssetDragOver={storeTheme.storeThemeAssetDragOver}
            setStoreThemeAssetDragOver={storeTheme.setStoreThemeAssetDragOver}
            handleStoreThemeAssetUpload={storeTheme.handleStoreThemeAssetUpload}
            storeThemeAssetHint={storeTheme.storeThemeAssetHint}
            setStoreThemeHasUnpublished={storeTheme.setStoreThemeHasUnpublished}
            setStoreThemeLocalPreview={storeTheme.setStoreThemeLocalPreview}
            storeThemeChecklist={storeTheme.storeThemeChecklist}
            storeThemeContrastSuggestions={storeTheme.storeThemeContrastSuggestions}
            applyStoreThemeContrastSuggestions={storeTheme.applyStoreThemeContrastSuggestions}
            storeThemeDiffRows={storeTheme.storeThemeDiffRows}
            storeThemePublishComment={storeTheme.storeThemePublishComment}
            setStoreThemePublishComment={storeTheme.setStoreThemePublishComment}
            saveStoreDraft={storeTheme.saveStoreDraft}
            publishStoreTheme={storeTheme.publishStoreTheme}
            storeThemeHasUnpublished={storeTheme.storeThemeHasUnpublished}
            storeThemeChecklistBlockingIssues={storeTheme.storeThemeChecklistBlockingIssues}
            storePreviewTheme={storeTheme.storePreviewTheme}
            storeThemeVersions={storeTheme.storeThemeVersions}
            restoreStoreVersion={storeTheme.restoreStoreVersion}
            storeThemeRestoring={storeTheme.storeThemeRestoring}
            storeThemeSelectedTemplate={storeTheme.storeThemeSelectedTemplate}
            setStoreThemeSelectedTemplate={storeTheme.setStoreThemeSelectedTemplate}
            applyStoreThemeTemplate={storeTheme.applyStoreThemeTemplate}
            importStoreThemeJson={(file) => storeTheme.importStoreThemeJson(file, company.name)}
            exportStoreThemeJson={() => storeTheme.exportStoreThemeJson(company.publicSlug || company.id)}
            discardStoreThemeChanges={storeTheme.discardStoreThemeChanges}
            previewBranchId={branches[0]?.id ?? null}
          />
        )}

        {tab === "plan" && (
          <AccountPlanTab
            company={company}
            recommendedPlanOption={planManager.recommendedPlanOption}
            targetPlanId={planManager.targetPlanId}
            setTargetPlanId={planManager.setTargetPlanId}
            planMonthlyDelta={planManager.planMonthlyDelta}
            planAnnualDelta={planManager.planAnnualDelta}
            setPlanMonths={planManager.setPlanMonths}
            activeAddonRows={snapshot.activeAddonRows}
            subscriptionEndsAt={snapshot.subscriptionEndsAt}
            subscriptionCancelReason={planManager.subscriptionCancelReason}
            setSubscriptionCancelReason={planManager.setSubscriptionCancelReason}
            subscriptionCancelError={planManager.subscriptionCancelError}
            subscriptionCancelOk={planManager.subscriptionCancelOk}
            subscriptionCancelBusy={planManager.subscriptionCancelBusy}
            cancellationScheduled={planManager.cancellationScheduled}
            subscriptionReactivateBusy={planManager.subscriptionReactivateBusy}
            setSubscriptionCancelAcknowledge={planManager.setSubscriptionCancelAcknowledge}
            setSubscriptionCancelFinalConfirm={planManager.setSubscriptionCancelFinalConfirm}
            setSubscriptionCancelModalOpen={planManager.setSubscriptionCancelModalOpen}
            canReactivateCancellation={planManager.canReactivateCancellation}
            handleReactivateSubscription={planManager.handleReactivateSubscription}
            addonOfferMatrix={planManager.addonOfferMatrix}
            availablePlans={availablePlans}
            planPreview={planManager.planPreview}
            planPreviewLoading={planManager.planPreviewLoading}
            selectedPlanOption={planManager.selectedPlanOption}
            planMonths={planManager.planMonths}
            planMethodSlug={planManager.planMethodSlug}
            setPlanMethodSlug={planManager.setPlanMethodSlug}
            selectedPlanMethodOption={planManager.selectedPlanMethodOption}
            planReason={planManager.planReason}
            setPlanReason={planManager.setPlanReason}
            handlePlanRequest={planManager.handlePlanRequest}
            planChangeBusy={planManager.planChangeBusy}
            acknowledgedImpactIds={planManager.acknowledgedImpactIds}
            setAcknowledgedImpactIds={planManager.setAcknowledgedImpactIds}
            availableAddons={availableAddons}
            targetAddonId={planManager.targetAddonId}
            setTargetAddonId={planManager.setTargetAddonId}
            ownedAddonKeys={planManager.ownedAddonKeys}
            selectedAddonOption={planManager.selectedAddonOption}
            selectedAddonModeLabel={planManager.selectedAddonModeLabel}
            selectedAddonSingleInstance={planManager.selectedAddonSingleInstance}
            selectedAddonOwned={planManager.selectedAddonOwned}
            addonPreview={planManager.addonPreview}
            addonPreviewLoading={planManager.addonPreviewLoading}
            addonQty={planManager.addonQty}
            setAddonQty={planManager.setAddonQty}
            selectedAddonEffectiveQty={planManager.selectedAddonEffectiveQty}
            addonMonthsNumber={planManager.addonMonthsNumber}
            addonMonths={planManager.addonMonths}
            setAddonMonths={planManager.setAddonMonths}
            selectedAddonIsMonthly={planManager.selectedAddonIsMonthly}
            addonMethodSlug={planManager.addonMethodSlug}
            setAddonMethodSlug={planManager.setAddonMethodSlug}
            selectedAddonMethodOption={planManager.selectedAddonMethodOption}
            addonEstimatedUnit={planManager.addonEstimatedUnit}
            addonEstimatedTotal={planManager.addonEstimatedTotal}
            addonNotes={planManager.addonNotes}
            setAddonNotes={planManager.setAddonNotes}
            handleAddonRequest={planManager.handleAddonRequest}
            addonPurchaseBusy={planManager.addonPurchaseBusy}
            acknowledgedAddonImpactIds={planManager.acknowledgedAddonImpactIds}
            setAcknowledgedAddonImpactIds={planManager.setAcknowledgedAddonImpactIds}
            branchEntitlements={snapshot.branchEntitlements}
            planFeedbackError={planManager.planFeedbackError}
            planFeedbackOk={planManager.planFeedbackOk}
            clearPlanFeedback={planManager.clearPlanFeedback}
          />
        )}

        {tab === "sucursales" && (
          <AccountSucursalesTab
            company={company}
            branches={branches}
            billingLoading={billingLoading}
            canRequestBranchWithoutPayment={canRequestBranchWithoutPayment}
            branchUnitPrice={billingOptions?.branchExpansionPriceMonthly ?? 0}
            branchFlowStep={branchFlow.branchFlowStep}
            setBranchFlowStep={branchFlow.setBranchFlowStep}
            isProjectedCapacityInvalid={branchFlow.isProjectedCapacityInvalid}
            setBillingError={branchFlow.setBillingError}
            billingOptions={billingOptions}
            activeBranchesCount={activeBranchesCount}
            billingError={branchFlow.billingError}
            billingOk={branchFlow.billingOk}
            branchRequestName={branchFlow.branchRequestName}
            setBranchRequestName={branchFlow.setBranchRequestName}
            expansionBranchName={branchFlow.expansionBranchName}
            setExpansionBranchName={branchFlow.setExpansionBranchName}
            branchRequestAddress={branchFlow.branchRequestAddress}
            setBranchRequestAddress={branchFlow.setBranchRequestAddress}
            expansionBranchAddress={branchFlow.expansionBranchAddress}
            setExpansionBranchAddress={branchFlow.setExpansionBranchAddress}
            expansionQty={branchFlow.expansionQty}
            setExpansionQty={branchFlow.setExpansionQty}
            expansionMonths={branchFlow.expansionMonths}
            setExpansionMonths={branchFlow.setExpansionMonths}
            expansionMethodSlug={branchFlow.expansionMethodSlug}
            setExpansionMethodSlug={branchFlow.setExpansionMethodSlug}
            projectedActiveBranches={branchFlow.projectedActiveBranches}
            projectedEffectiveMaxBranches={branchFlow.projectedEffectiveMaxBranches}
            projectedRemainingBranches={branchFlow.projectedRemainingBranches}
            expansionQtyNumber={branchFlow.expansionQtyNumber}
            expansionMonthsNumber={branchFlow.expansionMonthsNumber}
            expansionAmount={branchFlow.expansionAmount}
            branchRequestNotes={branchFlow.branchRequestNotes}
            setBranchRequestNotes={branchFlow.setBranchRequestNotes}
            expansionNotes={branchFlow.expansionNotes}
            setExpansionNotes={branchFlow.setExpansionNotes}
            busy={branchFlow.busy}
            onBranchRequest={branchFlow.handleBranchRequest}
            onCreateExpansionPayment={branchFlow.handleCreateExpansionPayment}
            createdExpansionPayment={branchFlow.createdExpansionPayment}
            proofUploading={branchFlow.proofUploading}
            proofFileUrl={branchFlow.proofFileUrl}
            onUploadPaymentProof={branchFlow.handleUploadPaymentProof}
            onBranchWizardBack={branchFlow.handleBranchWizardBack}
            onBranchWizardNext={branchFlow.handleBranchWizardNext}
          />
        )}

        {tab === "facturacion" && (
          <AccountFacturacionTab
            company={company}
            billingPaidTotal={billing.billingPaidTotal}
            billingPendingTotal={billing.billingPendingTotal}
            pendingPaymentsCount={billing.pendingPaymentsCount}
            latestPaidPaymentDate={billing.latestPaidPaymentDate}
            paymentStatusFilter={billing.paymentStatusFilter}
            setPaymentStatusFilter={billing.setPaymentStatusFilter}
            paymentReferenceQuery={billing.paymentReferenceQuery}
            setPaymentReferenceQuery={billing.setPaymentReferenceQuery}
            paymentDateFrom={billing.paymentDateFrom}
            setPaymentDateFrom={billing.setPaymentDateFrom}
            paymentDateTo={billing.paymentDateTo}
            setPaymentDateTo={billing.setPaymentDateTo}
            filteredPayments={billing.filteredPayments}
            createdExpansionPayment={branchFlow.createdExpansionPayment}
            onExportPaymentsCsv={billing.handleExportPaymentsCsv}
            onOpenBillingSupport={tickets.handleOpenBillingSupport}
          />
        )}

        {tab === "soporte" && (
          <AccountSoporteTab
            company={company}
            busy={tickets.busy}
            supportSubject={tickets.supportSubject}
            setSupportSubject={tickets.setSupportSubject}
            supportCategory={tickets.supportCategory}
            setSupportCategory={tickets.setSupportCategory}
            supportPriority={tickets.supportPriority}
            setSupportPriority={tickets.setSupportPriority}
            supportDescription={tickets.supportDescription}
            setSupportDescription={tickets.setSupportDescription}
            onSupportTicket={tickets.handleSupportTicket}
            onApplySupportTemplate={tickets.handleApplySupportTemplate}
            tickets={snapshot.tickets}
            selectedTicketId={tickets.selectedTicketId}
            onSelectTicket={tickets.handleSelectTicket}
            selectedTicket={tickets.selectedTicket}
            messageLoading={tickets.messageLoading}
            messages={tickets.messages}
            messageDraft={tickets.messageDraft}
            setMessageDraft={tickets.setMessageDraft}
            onSendMessage={tickets.handleSendMessage}
            ticketFeedbackError={tickets.ticketFeedbackError}
            ticketFeedbackOk={tickets.ticketFeedbackOk}
            clearTicketFeedback={tickets.clearTicketFeedback}
          />
        )}

        {tab === "seguridad" && <AccountSeguridadTab />}

        {/* Cancelación de suscripción — modal legacy (se migrará a ConfirmDialog en Fase 3) */}
        {planManager.subscriptionCancelModalOpen && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-zinc-950/55 px-4 py-6 backdrop-blur-[1px]">
            <div className="w-full max-w-2xl rounded-2xl border border-[#e5e5ea] bg-white p-5 shadow-2xl sm:p-6">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">Confirmar cancelacion al cierre del ciclo</h3>
              <p className="mt-2 text-sm text-[#6e6e73]">Tu tienda y panel seguiran operativos hasta la fecha de vencimiento actual. Al llegar esa fecha, el acceso se suspende.</p>
              <div className="mt-4 rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] px-4 py-3 text-sm text-[#1d1d1f]">
                <p><strong>Estado actual:</strong> {displayStatus(snapshot.subscriptionStatus, SUBSCRIPTION_STATUS_LABELS)}</p>
              </div>
              <div className="mt-4 space-y-2">
                <label className="flex items-start gap-2 text-sm text-[#6e6e73]">
                  <input type="checkbox" checked={planManager.subscriptionCancelAcknowledge} onChange={(e) => planManager.setSubscriptionCancelAcknowledge(e.target.checked)} className="mt-1" />
                  Entiendo que no hay reembolso automatico del periodo ya pagado.
                </label>
                <label className="flex items-start gap-2 text-sm text-[#6e6e73]">
                  <input type="checkbox" checked={planManager.subscriptionCancelFinalConfirm} onChange={(e) => planManager.setSubscriptionCancelFinalConfirm(e.target.checked)} className="mt-1" />
                  Confirmo que quiero programar la cancelacion al cierre del ciclo.
                </label>
              </div>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => planManager.setSubscriptionCancelModalOpen(false)} disabled={planManager.subscriptionCancelBusy} className="h-9 rounded-xl border border-[#d2d2d7] px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-50">Volver</button>
                <button type="button" onClick={planManager.handleCancelSubscription} disabled={planManager.subscriptionCancelBusy || !planManager.subscriptionCancelAcknowledge || !planManager.subscriptionCancelFinalConfirm} className="h-9 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:pointer-events-none disabled:opacity-50">
                  {planManager.subscriptionCancelBusy ? "Programando..." : "Confirmar cancelacion"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#6e6e73] sm:px-4 sm:text-sm">
          Soporte directo:{" "}
          <a className="font-medium text-indigo-600 hover:underline" href={`mailto:${company.supportEmail}`}>
            {company.supportEmail}
          </a>
        </div>
      </CustomerAccountShell>
    </>
  );
}
