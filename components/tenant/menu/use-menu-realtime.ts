"use client";

import { useEffect, useMemo, useRef } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { TENANT_UI_CONFIG } from "@/lib/tenant/config/tenant-ui-config";
import { createSupabaseBrowserClient } from "../../../utils/supabase/client";

export function useMenuRealtime(
	companyId: string | null,
	selectedBranchId: string | null | undefined,
	router: AppRouterInstance,
	options?: { deferMs?: number },
) {
	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const supabase = useMemo(() => createSupabaseBrowserClient("tenant"), []);

	useEffect(() => {
		if (!companyId) return;

		let channel: ReturnType<typeof supabase.channel> | null = null;
		let cancelled = false;

		const scheduleServerRefresh = () => {
			if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
			refreshTimerRef.current = setTimeout(
				() => router.refresh(),
				TENANT_UI_CONFIG.menuRealtimeDebounceMs,
			);
		};

		const subscribe = () => {
			if (cancelled) return;

			let nextChannel = supabase
				.channel(`tenant-menu-realtime:${companyId}:${selectedBranchId ?? "none"}`)
				.on("postgres_changes", { event: "*", schema: "public", table: "branches", filter: `company_id=eq.${companyId}` }, scheduleServerRefresh)
				.on("postgres_changes", { event: "*", schema: "public", table: "cash_shifts", filter: `company_id=eq.${companyId}` }, scheduleServerRefresh)
				.on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `company_id=eq.${companyId}` }, scheduleServerRefresh)
				.on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `company_id=eq.${companyId}` }, scheduleServerRefresh);

			if (selectedBranchId) {
				nextChannel = nextChannel
					.on("postgres_changes", { event: "*", schema: "public", table: "product_prices", filter: `branch_id=eq.${selectedBranchId}` }, scheduleServerRefresh)
					.on("postgres_changes", { event: "*", schema: "public", table: "product_branch", filter: `branch_id=eq.${selectedBranchId}` }, scheduleServerRefresh)
					.on("postgres_changes", { event: "*", schema: "public", table: "product_extras_groups", filter: `branch_id=eq.${selectedBranchId}` }, scheduleServerRefresh)
					.on("postgres_changes", { event: "*", schema: "public", table: "product_upsell_beverages", filter: `branch_id=eq.${selectedBranchId}` }, scheduleServerRefresh);
			}

			channel = nextChannel;
			channel.subscribe();
		};

		const deferMs = options?.deferMs ?? TENANT_UI_CONFIG.menuRealtimeDeferMs;
		const idleCallback = typeof window !== "undefined" ? window.requestIdleCallback : undefined;
		const deferId = idleCallback
			? idleCallback(() => subscribe(), { timeout: deferMs })
			: window.setTimeout(subscribe, deferMs);

		return () => {
			cancelled = true;
			if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
			if (idleCallback && typeof deferId === "number") {
				window.cancelIdleCallback(deferId);
			} else {
				window.clearTimeout(deferId as number);
			}
			if (channel) supabase.removeChannel(channel);
		};
	}, [supabase, companyId, selectedBranchId, router, options?.deferMs]);
}
