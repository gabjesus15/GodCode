"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/utils/supabase/client";
import type {
	ActiveAddon,
	BranchEntitlementSummary,
	PaymentSummary,
	RealtimeSnapshotResponse,
	ScheduledPlanChange,
	TicketSummary,
} from "../shared/customer-account-types";

export type SnapshotScope = "company" | "payments" | "tickets" | "addons" | "entitlements" | "full";

export type AccountSnapshotState = {
	subscriptionStatus: string | null;
	subscriptionEndsAt: string | null;
	scheduledPlanChange: ScheduledPlanChange | null;
	paymentRows: PaymentSummary[];
	tickets: TicketSummary[];
	branchEntitlements: BranchEntitlementSummary[];
	activeAddonRows: ActiveAddon[];
	lastRealtimeSyncAt: string | null;
	isSyncing: boolean;
};

export type UseAccountSnapshotReturn = AccountSnapshotState & {
	refresh: (scope?: SnapshotScope) => Promise<void>;
	setPaymentRows: React.Dispatch<React.SetStateAction<PaymentSummary[]>>;
	setTickets: React.Dispatch<React.SetStateAction<TicketSummary[]>>;
	setBranchEntitlements: React.Dispatch<React.SetStateAction<BranchEntitlementSummary[]>>;
	setActiveAddonRows: React.Dispatch<React.SetStateAction<ActiveAddon[]>>;
	setSubscriptionStatus: React.Dispatch<React.SetStateAction<string | null>>;
	setSubscriptionEndsAt: React.Dispatch<React.SetStateAction<string | null>>;
};

const FRESH_SSR_MS = 30_000;
const REALTIME_DEBOUNCE_MS = 650;
/** Con Realtime conectado el sondeo es solo un respaldo. */
const POLL_SUBSCRIBED_MS = 120_000;
const POLL_FALLBACK_MS = 60_000;

export function useAccountSnapshot(
	initialPayments: PaymentSummary[],
	initialTickets: TicketSummary[],
	initialEntitlements: BranchEntitlementSummary[],
	initialAddons: ActiveAddon[],
	initialStatus: string | null,
	initialEndsAt: string | null,
	options?: {
		enablePolling?: boolean;
		companyId?: string;
		initialSyncedAt?: string | null;
		initialScheduledPlanChange?: ScheduledPlanChange | null;
	},
): UseAccountSnapshotReturn {
	const enablePolling = options?.enablePolling !== false;
	const [subscriptionStatus, setSubscriptionStatus] = useState(initialStatus);
	const [subscriptionEndsAt, setSubscriptionEndsAt] = useState(initialEndsAt);
	const [scheduledPlanChange, setScheduledPlanChange] = useState<ScheduledPlanChange | null>(
		options?.initialScheduledPlanChange ?? null,
	);
	const [paymentRows, setPaymentRows] = useState(initialPayments);
	const [tickets, setTickets] = useState(initialTickets);
	const [branchEntitlements, setBranchEntitlements] = useState(initialEntitlements);
	const [activeAddonRows, setActiveAddonRows] = useState(initialAddons);
	const [lastRealtimeSyncAt, setLastRealtimeSyncAt] = useState<string | null>(options?.initialSyncedAt ?? null);
	const [isSyncing, setIsSyncing] = useState(false);
	const abortRef = useRef<AbortController | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const pendingScopeRef = useRef<SnapshotScope>("full");

	const applySnapshot = useCallback((data: Partial<RealtimeSnapshotResponse>) => {
		if (Array.isArray(data.payments)) setPaymentRows(data.payments);
		if (Array.isArray(data.tickets)) setTickets(data.tickets);
		if (Array.isArray(data.branchEntitlements)) setBranchEntitlements(data.branchEntitlements);
		if (data.company) {
			setSubscriptionStatus(data.company.subscription_status ?? null);
			setSubscriptionEndsAt(data.company.subscription_ends_at ?? null);
			if (data.company.scheduled_plan_change !== undefined) {
				setScheduledPlanChange(data.company.scheduled_plan_change ?? null);
			}
		}
		if (Array.isArray(data.activeAddons)) {
			setActiveAddonRows(
				data.activeAddons.map((row) => ({
					id: String(row.id ?? ""),
					addonId: String(row.addon_id ?? ""),
					addonSlug: String(row.slug ?? ""),
					addonType: String(row.type ?? ""),
					status: String(row.status ?? "active"),
					expires_at: row.expires_at ?? null,
					addonName: String(row.name ?? "Extra"),
				})),
			);
		}
		setLastRealtimeSyncAt(new Date().toISOString());
	}, []);

	const refresh = useCallback(
		async (scope: SnapshotScope = "full") => {
			abortRef.current?.abort();
			const ctrl = new AbortController();
			abortRef.current = ctrl;
			setIsSyncing(true);
			try {
				const sp = scope === "full" ? "" : `?scope=${scope}`;
				const res = await fetch(`/api/customer-account/realtime-snapshot${sp}`, {
					cache: "no-store",
					signal: ctrl.signal,
				});
				const data = (await res.json().catch(() => ({}))) as Partial<RealtimeSnapshotResponse> & { error?: string };
				if (!res.ok || ctrl.signal.aborted) return;
				applySnapshot(data);
			} catch {
				// Un sondeo fallido no se muestra como error: el siguiente lo corrige.
			} finally {
				if (!ctrl.signal.aborted) setIsSyncing(false);
			}
		},
		[applySnapshot],
	);

	const scheduleRefresh = useCallback(
		(scope: SnapshotScope) => {
			pendingScopeRef.current = scope;
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => {
				void refresh(pendingScopeRef.current);
			}, REALTIME_DEBOUNCE_MS);
		},
		[refresh],
	);

	const companyId = options?.companyId;
	const initialSyncedAt = options?.initialSyncedAt;

	useEffect(() => {
		if (!enablePolling) return undefined;

		const ssrIsFresh = initialSyncedAt != null && Date.now() - new Date(initialSyncedAt).getTime() < FRESH_SSR_MS;
		if (!ssrIsFresh) void refresh("full");

		let disposed = false;
		let realtimeJoined = false;
		let pollTimer: number | undefined;

		// Un temporizador que se reprograma solo. Antes un setInterval se recreaba cada 5 s
		// para ajustar el intervalo y nunca llegaba a dispararse.
		const schedulePoll = () => {
			pollTimer = window.setTimeout(
				() => {
					if (disposed) return;
					if (document.visibilityState === "hidden") {
						schedulePoll();
						return;
					}
					void refresh("full").finally(() => {
						if (!disposed) schedulePoll();
					});
				},
				realtimeJoined ? POLL_SUBSCRIBED_MS : POLL_FALLBACK_MS,
			);
		};

		const supabase = companyId ? createSupabaseBrowserClient("tenant") : null;
		const channel = supabase && companyId
			? supabase
					.channel(`account-snapshot:${companyId}`)
					.on(
						"postgres_changes",
						{ event: "*", schema: "public", table: "companies", filter: `id=eq.${companyId}` },
						() => scheduleRefresh("company"),
					)
					.on(
						"postgres_changes",
						{ event: "*", schema: "public", table: "company_addons", filter: `company_id=eq.${companyId}` },
						() => scheduleRefresh("addons"),
					)
					.subscribe((status: string) => {
						realtimeJoined = status === "SUBSCRIBED";
					})
			: null;

		schedulePoll();

		return () => {
			disposed = true;
			window.clearTimeout(pollTimer);
			abortRef.current?.abort();
			if (debounceRef.current) clearTimeout(debounceRef.current);
			if (supabase && channel) void supabase.removeChannel(channel);
		};
	}, [refresh, scheduleRefresh, enablePolling, companyId, initialSyncedAt]);

	return {
		subscriptionStatus,
		subscriptionEndsAt,
		scheduledPlanChange,
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
