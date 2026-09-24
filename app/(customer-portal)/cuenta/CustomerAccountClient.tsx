"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { describePortalOrder } from "@/lib/billing/portal-orders";
import { resolveSubscriptionPhase } from "@/lib/billing/portal-pricing";
import { CustomerAccountShell } from "@/components/customer-portal/shell/CustomerAccountShell";
import { CustomerAccountShellSkeleton } from "@/components/customer-portal/shell/CustomerAccountShellSkeleton";
import { SUBSCRIPTION_STATUS_LABELS, PAYMENT_STATUS_LABELS, TICKET_CATEGORY_LABELS, TICKET_STATUS_LABELS } from "@/components/customer-portal/shared/customer-account-constants";
import { displayStatus, fmtDay, fmtUsd, branchEntitlementStatusLabel } from "@/components/customer-portal/shared/customer-account-format";

import { useAccountSnapshot }  from "@/components/customer-portal/hooks/use-account-snapshot";
import { useAddonPurchase, useSubscriptionBilling } from "@/components/customer-portal/hooks/use-subscription-billing";
import { useStoreTheme }       from "@/components/customer-portal/hooks/use-store-theme";
import { useMenuSettings }     from "@/components/customer-portal/hooks/use-menu-settings";
import { useBranchFlow }       from "@/components/customer-portal/hooks/use-branch-flow";
import { useBillingFilters }   from "@/components/customer-portal/hooks/use-billing-filters";
import { useTickets }          from "@/components/customer-portal/hooks/use-tickets";
import { useUnsavedGuard }     from "@/components/customer-portal/hooks/use-unsaved-guard";
import { useConfirmDialog }    from "@/components/customer-portal/ui/ConfirmDialog";
import { OrderPaymentDialog }  from "@/components/customer-portal/payments/order-payment-dialog";

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
  BillingOptionsResponse,
  CustomerAccountClientProps,
  PaymentSummary,
  PortalTab,
} from "@/components/customer-portal/shared/customer-account-types";

export type { CustomerAccountClientProps } from "@/components/customer-portal/shared/customer-account-types";

export function CustomerAccountClient(props: CustomerAccountClientProps) {
  const {
    company, branches, businessInfo, payments, activeAddons, availablePlans, availableAddons,
    initialTickets, initialBranchEntitlements, initialBillingOptions, initialSyncedAt,
  } = props;

  const [mounted,       setMounted]       = useState(false);
  const [tab,           setTab]           = useState<PortalTab>(props.initialTab ?? "resumen");
  const [activityFilter, setActivityFilter] = useState<"all" | "pago" | "ticket" | "extra">("all");
  const [billingOptions, setBillingOptions] = useState<BillingOptionsResponse | null>(initialBillingOptions ?? null);
  const [billingLoading, setBillingLoading] = useState(false);
  /** Pedido que se está pagando en el diálogo de pago (se abre desde cualquier pestaña). */
  const [payingOrder, setPayingOrder] = useState<PaymentSummary | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // ── Foundation hooks ────────────────────────────────────────────────────────

  const confirmDialog = useConfirmDialog();

  const snapshot = useAccountSnapshot(
    payments, initialTickets, initialBranchEntitlements, activeAddons,
    company.subscriptionStatus, company.subscriptionEndsAt,
    {
      enablePolling: tab !== "tienda" && tab !== "seguridad",
      companyId: company.id,
      initialSyncedAt,
      initialScheduledPlanChange: company.scheduledPlanChange,
    },
  );
  const refreshAll = useCallback(() => snapshot.refresh("full"), [snapshot]);

  const loadBillingOptions = useCallback(async () => {
    setBillingLoading(true);
    try {
      const res  = await fetch("/api/customer-account/billing", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as BillingOptionsResponse & { error?: string };
      if (res.ok) setBillingOptions(data);
    } catch {
      // Sin opciones frescas se siguen usando las del servidor.
    } finally {
      setBillingLoading(false);
    }
  }, []);

  const openOrderPayment = useCallback((order: PaymentSummary) => {
    setPayingOrder(order);
    if (!billingOptions && !billingLoading) void loadBillingOptions();
  }, [billingOptions, billingLoading, loadBillingOptions]);

  const openOrderById = useCallback((orderId: string) => {
    const order = snapshot.paymentRows.find((row) => row.id === orderId);
    if (order) openOrderPayment(order);
    else void snapshot.refresh("payments");
  }, [snapshot, openOrderPayment]);

  const subscriptionBilling = useSubscriptionBilling({
    subscriptionStatus: snapshot.subscriptionStatus,
    subscriptionEndsAt: snapshot.subscriptionEndsAt,
    onRefresh: refreshAll,
    onSubscriptionChange: (status, endsAt) => { snapshot.setSubscriptionStatus(status); snapshot.setSubscriptionEndsAt(endsAt); },
    onOrderCreated: openOrderPayment,
    onOpenOrder: openOrderById,
  });

  const addonPurchase = useAddonPurchase({
    onRefresh: refreshAll,
    onOrderCreated: openOrderPayment,
    onApplied: (message) => subscriptionBilling.setFeedback({ tone: "success", message }),
  });

  const storeTheme = useStoreTheme(
    () => confirmDialog.confirm({
      title:        "Descartar cambios",
      description:  "Se descartarán tus cambios y el borrador volverá a lo que está publicado.",
      confirmLabel: "Descartar",
      tone:         "danger",
    })
  );

  const menuSettings = useMenuSettings(tab === "tienda");

  const tickets = useTickets(snapshot.tickets, company);

  // Keep tickets in sync with snapshot
  useEffect(() => { tickets.setTickets(snapshot.tickets); }, [snapshot.tickets]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate to soporte tab from ticket hooks
  useEffect(() => {
    tickets.setOnNavigateToSupport(() => setTab("soporte"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const activeBranchesCount = billingOptions?.activeBranchCount ?? branches.filter((b) => b.is_active !== false).length;

  const branchFlow = useBranchFlow({
    company,
    billingOptions,
    activeBranchesCount,
    onTicketCreated: (ticket) => tickets.setTickets((prev) => ticket ? [ticket, ...prev.filter((t) => t.id !== ticket.id)] : prev),
    onOrderCreated: openOrderPayment,
    onReload: async () => { await Promise.all([loadBillingOptions(), refreshAll()]); },
  });

  const billing = useBillingFilters(snapshot.paymentRows);

  const [homePageDirty, setHomePageDirty] = useState(false);
  const unsavedGuard = useUnsavedGuard(
    tab,
    { tienda: storeTheme.storeThemeHasLocalUnsavedChanges, perfil: homePageDirty },
    confirmDialog,
  );

  useEffect(() => {
    if ((tab === "plan" || tab === "sucursales") && !billingOptions && !billingLoading) {
      void loadBillingOptions();
    }
  }, [tab, billingOptions, billingLoading, loadBillingOptions]);

  // Track support tab for ticket polling
  useEffect(() => { tickets.setIsOnSupportTab(tab === "soporte"); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values shared across tabs ──────────────────────────────────────

  const describeOrder = useCallback((order: PaymentSummary) => describePortalOrder(order, {
    plan: (id) => (id === company.planId ? company.planName : null) ?? availablePlans.find((plan) => plan.id === id)?.name ?? null,
    addon: (id) =>
      availableAddons.find((addon) => addon.id === id)?.name ??
      snapshot.activeAddonRows.find((row) => row.addonId === id)?.addonName ??
      null,
  }), [company.planId, company.planName, availablePlans, availableAddons, snapshot.activeAddonRows]);

  const openOrders = billing.openOrders;
  const openTicketsCount       = snapshot.tickets.filter((t) => ["open","in_progress","waiting_customer"].includes(t.status)).length;
  const latestPaidPayment      = snapshot.paymentRows.find((p) => String(p.status ?? "").toLowerCase() === "paid") ?? null;
  const activeEntitlementsCount = snapshot.branchEntitlements.filter((e) => String(e.status).toLowerCase() === "active").length;
  const phase = subscriptionBilling.phase;

  const expiryDays = (() => {
    if (!snapshot.subscriptionEndsAt) return null;
    const end = new Date(snapshot.subscriptionEndsAt).getTime();
    if (Number.isNaN(end)) return null;
    return Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24));
  })();

  const cancellationScheduled = resolveSubscriptionPhase(snapshot.subscriptionStatus, snapshot.subscriptionEndsAt) === "cancelling";

  const accountAlerts = useMemo(() => {
    const alerts: Array<{ id: string; tone: "warn" | "info" | "ok"; title: string; description: string }> = [];
    const endDate = fmtDay(snapshot.subscriptionEndsAt, company.timezone);
    if (phase === "expired") {
      alerts.push({ id: "expired", tone: "warn", title: "Tu suscripción venció", description: "Tu tienda está fuera de línea. Renueva desde «Plan y extras» para volver a estar en línea." });
    } else if (phase === "cancelling") {
      alerts.push({ id: "cancelling", tone: "info", title: "Cancelaste tu suscripción", description: `Tu tienda sigue online hasta el ${endDate}. Puedes reactivarla gratis antes de esa fecha.` });
    } else if (phase === "payment_pending") {
      alerts.push({ id: "payment-pending", tone: "info", title: "Estamos validando tu primer pago", description: "Te avisamos por correo en cuanto tu cuenta quede activa." });
    } else if ((phase === "active" || phase === "trial") && expiryDays != null && expiryDays <= 7) {
      alerts.push({
        id: "expiring",
        tone: "info",
        title: phase === "trial" ? "Tu prueba termina pronto" : "Tu plan vence pronto",
        description: `${expiryDays === 1 ? "Queda 1 día" : `Quedan ${expiryDays} días`} (hasta el ${endDate}). ${phase === "trial" ? "Paga tu plan" : "Renueva"} para no cortar el servicio.`,
      });
    }
    const awaitingOrders = openOrders.filter((order) => String(order.status ?? "").toLowerCase() !== "pending_validation" || !order.reference_file_url);
    if (awaitingOrders.length > 0) {
      alerts.push({ id: "orders", tone: "info", title: awaitingOrders.length === 1 ? "Tienes un pago por completar" : `Tienes ${awaitingOrders.length} pagos por completar`, description: "Págalos con PayPal o envía el comprobante desde «Plan y extras» o «Facturación»." });
    } else if (openOrders.length > 0) {
      alerts.push({ id: "orders-review", tone: "ok", title: "Estamos revisando tu comprobante", description: "Te avisamos por correo en cuanto lo validemos." });
    }
    if (billingOptions?.requiresPaymentForExpansion && (billingOptions.effectiveMaxBranches ?? 0) > 1) {
      alerts.push({ id: "branch-capacity", tone: "ok", title: "Usaste todo el cupo de sucursales", description: "Si abres otra, puedes sumar un cupo extra desde «Sucursales»." });
    }
    if (alerts.length === 0) alerts.push({ id: "all-good", tone: "ok", title: "Tu cuenta está al día", description: "No hay nada pendiente por ahora." });
    return alerts;
  }, [phase, expiryDays, snapshot.subscriptionEndsAt, company.timezone, openOrders, billingOptions?.requiresPaymentForExpansion, billingOptions?.effectiveMaxBranches]);

  const activityTimeline = useMemo(() => {
    const paymentItems: AccountActivityItem[] = snapshot.paymentRows.map((p) => ({ id: `p-${p.id}`, type: "pago", title: describeOrder(p), detail: `${fmtUsd(p.amount_paid, company.locale)} · ${displayStatus(p.status, PAYMENT_STATUS_LABELS)}`, status: String(p.status ?? ""), occurredAt: p.payment_date ?? "", amount: p.amount_paid }));
    const ticketItems: AccountActivityItem[]  = snapshot.tickets.map((t) => ({ id: `t-${t.id}`, type: "ticket", title: t.subject, detail: `${displayStatus(t.status, TICKET_STATUS_LABELS)} · ${TICKET_CATEGORY_LABELS[t.category] ?? t.category}`, status: t.status, occurredAt: t.lastMessageAt || t.createdAt }));
    const entitlementItems: AccountActivityItem[] = snapshot.branchEntitlements.map((e) => ({ id: `e-${e.id}`, type: "extra", title: e.quantity === 1 ? "Cupo extra de sucursal" : `${e.quantity} cupos extra de sucursal`, detail: `${fmtUsd(e.amountPaid, company.locale)} · ${branchEntitlementStatusLabel(e.status)}`, status: e.status, occurredAt: e.createdAt, amount: e.amountPaid }));
    return [...paymentItems, ...ticketItems, ...entitlementItems].filter((i) => i.occurredAt).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 20);
  }, [snapshot.paymentRows, snapshot.tickets, snapshot.branchEntitlements, company.locale, describeOrder]);

  const filteredActivityTimeline = useMemo(
    () =>
      activityFilter === "all"
        ? activityTimeline
        : activityTimeline.filter((item: AccountActivityItem) => item.type === activityFilter),
    [activityTimeline, activityFilter],
  );

  // El pedido del diálogo, con el estado más reciente del servidor.
  const currentPayingOrder = payingOrder
    ? snapshot.paymentRows.find((row) => row.id === payingOrder.id) ?? payingOrder
    : null;

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
            latestPayment={latestPaidPayment}
            branchCapacity={billingOptions?.effectiveMaxBranches ?? billingOptions?.maxBranches ?? company.planMaxBranches}
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
            onNavigate={handleTabChange}
            onDirtyChange={setHomePageDirty}
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
            menuSettingsLoading={menuSettings.menuSettingsLoading}
            menuSettingsSaving={menuSettings.menuSettingsSaving}
            menuSettingsError={menuSettings.menuSettingsError}
            menuSettingsOk={menuSettings.menuSettingsOk}
            menuSettingsCartEnabled={menuSettings.menuSettings.cartEnabled}
            menuSettingsOrderChannel={menuSettings.menuSettings.orderChannel}
            menuSettingsPlanAllowsOnlineOrdering={menuSettings.planAllowsOnlineOrdering}
            menuSettingsDirty={menuSettings.menuSettingsDirty}
            onMenuSettingsCartEnabledChange={menuSettings.setCartEnabled}
            onMenuSettingsOrderChannelChange={menuSettings.setOrderChannel}
            onSaveMenuSettings={() => { void menuSettings.saveMenuSettings(); }}
          />
        )}

        {tab === "plan" && (
          <AccountPlanTab
            company={company}
            subscriptionEndsAt={snapshot.subscriptionEndsAt}
            scheduledPlanChange={snapshot.scheduledPlanChange}
            availablePlans={availablePlans}
            availableAddons={availableAddons}
            activeAddonRows={snapshot.activeAddonRows}
            openOrders={openOrders}
            describeOrder={describeOrder}
            billing={subscriptionBilling}
            addonPurchase={addonPurchase}
            onPayOrder={openOrderPayment}
          />
        )}

        {tab === "sucursales" && (
          <AccountSucursalesTab
            company={company}
            branches={branches}
            billingOptions={billingOptions}
            billingLoading={billingLoading}
            activeBranchesCount={activeBranchesCount}
            branchEntitlements={snapshot.branchEntitlements}
            branchFlow={branchFlow}
          />
        )}

        {tab === "facturacion" && (
          <AccountFacturacionTab
            company={company}
            billing={billing}
            describeOrder={describeOrder}
            onPayOrder={openOrderPayment}
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

        <OrderPaymentDialog
          key={currentPayingOrder?.id ?? "none"}
          order={currentPayingOrder}
          concept={currentPayingOrder ? describeOrder(currentPayingOrder) : ""}
          open={currentPayingOrder != null}
          onOpenChange={(open) => { if (!open) setPayingOrder(null); }}
          company={company}
          billingOptions={billingOptions}
          billingLoading={billingLoading}
          onChanged={async () => { await Promise.all([refreshAll(), loadBillingOptions()]); }}
        />

        <div className="rounded-xl border border-[#e5e5ea] bg-[#fbfbfd] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#6e6e73] sm:px-4 sm:text-sm">
          ¿Dudas con tu cuenta? Escríbenos a{" "}
          <a className="font-medium text-indigo-600 hover:underline" href={`mailto:${company.supportEmail}`}>
            {company.supportEmail}
          </a>
        </div>
      </CustomerAccountShell>
    </>
  );
}
