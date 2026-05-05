"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActiveAddon,
  BranchEntitlementSummary,
  PaymentSummary,
  RealtimeSnapshotResponse,
  TicketSummary,
} from "../shared/customer-account-types";

export type AccountSnapshotState = {
  subscriptionStatus:    string | null;
  subscriptionEndsAt:    string | null;
  paymentRows:           PaymentSummary[];
  tickets:               TicketSummary[];
  branchEntitlements:    BranchEntitlementSummary[];
  activeAddonRows:       ActiveAddon[];
  lastRealtimeSyncAt:    string | null;
  isSyncing:             boolean;
};

export type UseAccountSnapshotReturn = AccountSnapshotState & {
  refresh:                  () => Promise<void>;
  setPaymentRows:           React.Dispatch<React.SetStateAction<PaymentSummary[]>>;
  setTickets:               React.Dispatch<React.SetStateAction<TicketSummary[]>>;
  setBranchEntitlements:    React.Dispatch<React.SetStateAction<BranchEntitlementSummary[]>>;
  setActiveAddonRows:       React.Dispatch<React.SetStateAction<ActiveAddon[]>>;
  setSubscriptionStatus:    React.Dispatch<React.SetStateAction<string | null>>;
  setSubscriptionEndsAt:    React.Dispatch<React.SetStateAction<string | null>>;
};

export function useAccountSnapshot(
  initialPayments:      PaymentSummary[],
  initialTickets:       TicketSummary[],
  initialEntitlements:  BranchEntitlementSummary[],
  initialAddons:        ActiveAddon[],
  initialStatus:        string | null,
  initialEndsAt:        string | null,
  options?: { enablePolling?: boolean },
): UseAccountSnapshotReturn {
  const enablePolling = options?.enablePolling !== false;
  const [subscriptionStatus, setSubscriptionStatus] = useState(initialStatus);
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState(initialEndsAt);
  const [paymentRows,        setPaymentRows]         = useState(initialPayments);
  const [tickets,            setTickets]             = useState(initialTickets);
  const [branchEntitlements, setBranchEntitlements]  = useState(initialEntitlements);
  const [activeAddonRows,    setActiveAddonRows]     = useState(initialAddons);
  const [lastRealtimeSyncAt, setLastRealtimeSyncAt]  = useState<string | null>(null);
  const [isSyncing,          setIsSyncing]           = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsSyncing(true);
    try {
      const res  = await fetch("/api/customer-account/realtime-snapshot", { cache: "no-store", signal: ctrl.signal });
      const data = (await res.json().catch(() => ({}))) as Partial<RealtimeSnapshotResponse> & { error?: string };
      if (!res.ok || ctrl.signal.aborted) return;

      if (Array.isArray(data.payments))           setPaymentRows(data.payments);
      if (Array.isArray(data.tickets))            setTickets(data.tickets);
      if (Array.isArray(data.branchEntitlements)) setBranchEntitlements(data.branchEntitlements);
      if (data.company) {
        setSubscriptionStatus(data.company.subscription_status ?? null);
        setSubscriptionEndsAt(data.company.subscription_ends_at ?? null);
      }
      if (Array.isArray(data.activeAddons)) {
        setActiveAddonRows(data.activeAddons.map((row) => ({
          id:        String(row.id       ?? ""),
          addonId:   String(row.addon_id ?? ""),
          addonSlug: String(row.slug     ?? ""),
          addonType: String(row.type     ?? ""),
          status:    String(row.status   ?? "active"),
          expires_at: row.expires_at     ?? null,
          addonName: String(row.name     ?? "Extra"),
        })));
      }
      setLastRealtimeSyncAt(new Date().toISOString());
    } catch {
      // silent: polling failure should not surface as a UI error
    } finally {
      if (!ctrl.signal.aborted) setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!enablePolling) return undefined;
    void refresh();
    const id = window.setInterval(() => void refresh(), 15_000);
    return () => {
      window.clearInterval(id);
      abortRef.current?.abort();
    };
    /*
     * DEUDA TÉCNICA — Fase 8: migración a Supabase Realtime
     *
     * Para reemplazar el polling de 15 s con suscripciones en tiempo real se requiere:
     *   1. Habilitar Supabase Realtime en las tablas: `payments_history`, `companies`,
     *      `company_addons`, `saas_tickets`.
     *   2. Añadir políticas RLS SELECT para el rol `authenticated` (tenant) en cada tabla
     *      filtradas por `company_id = auth.uid()` (o función equivalente). Actualmente
     *      `payments_history` solo tiene policies para `is_saas_admin_reader()`.
     *   3. Confirmar `REPLICA IDENTITY FULL` o al menos `REPLICA IDENTITY DEFAULT` en las
     *      tablas que necesiten enviar columnas antiguas en UPDATE/DELETE.
     *   4. Sustituir el setInterval por:
     *        const channel = createSupabaseBrowserClient("tenant")
     *          .channel("account-snapshot")
     *          .on("postgres_changes", { event: "*", schema: "public", table: "payments_history",
     *               filter: `company_id=eq.${companyId}` }, () => void refresh())
     *          // ...más tablas
     *          .subscribe();
     *      Mantener el polling como fallback si channel.state !== "joined".
     */
  }, [refresh, enablePolling]);

  return {
    subscriptionStatus,
    subscriptionEndsAt,
    paymentRows,
    tickets,
    branchEntitlements,
    activeAddonRows,
    lastRealtimeSyncAt,
    isSyncing,
    refresh,
    setPaymentRows,
    setTickets,
    setBranchEntitlements,
    setActiveAddonRows,
    setSubscriptionStatus,
    setSubscriptionEndsAt,
  };
}
