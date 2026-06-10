"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
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
  options?: { enablePolling?: boolean; companyId?: string },
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

  const companyId = options?.companyId;

  useEffect(() => {
    if (!enablePolling) return undefined;

    // Trigger an immediate refresh on mount.
    void refresh();

    /*
     * HYBRID APPROACH — Fase 3: Supabase Realtime + polling fallback
     *
     * Tables safe for Realtime (tenant RLS allows filter by id / company_id):
     *   - `companies`      → filter: id=eq.${companyId}
     *   - `company_addons` → filter: company_id=eq.${companyId}
     *
     * Tables with RLS issues (payments_history only has is_saas_admin_reader() policies;
     * saas_tickets may be restricted similarly) → covered by polling fallback.
     *
     * Strategy:
     *   • With companyId: subscribe Realtime for safe tables + 60 s polling safety-net.
     *   • Without companyId: 15 s polling only (original behaviour).
     */
    if (!companyId) {
      // Original behaviour: 15 s polling, no Realtime.
      const id = window.setInterval(() => void refresh(), 15_000);
      return () => {
        window.clearInterval(id);
        abortRef.current?.abort();
      };
    }

    // With companyId: Realtime channel for the tables we can safely filter.
    const supabase = createSupabaseBrowserClient("tenant");
    let realtimeJoined = false;

    const channel = supabase
      .channel(`account-snapshot:${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "companies",
          filter: `id=eq.${companyId}`,
        },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "company_addons",
          filter: `company_id=eq.${companyId}`,
        },
        () => void refresh(),
      )
      .subscribe((status: string) => {
        realtimeJoined = status === "SUBSCRIBED";
      });

    // 60 s polling as safety-net:
    //  • When Realtime is joined: catches tables with RLS issues (payments_history, saas_tickets).
    //  • If Realtime fails to connect: acts as full fallback.
    const id = window.setInterval(() => void refresh(), 60_000);

    return () => {
      window.clearInterval(id);
      abortRef.current?.abort();
      void supabase.removeChannel(channel);
      // Suppress unused variable warning — realtimeJoined is intentionally read-only here.
      void realtimeJoined;
    };
  }, [refresh, enablePolling, companyId]);

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
