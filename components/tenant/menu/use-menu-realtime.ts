"use client";

import { useEffect, useMemo, useRef } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

import { createSupabaseBrowserClient } from "../../../utils/supabase/client";

export function useMenuRealtime(
	companyId: string | null,
	selectedBranchId: string | null | undefined,
	router: AppRouterInstance,
) {
	const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const supabase = useMemo(() => createSupabaseBrowserClient("tenant"), []);

	useEffect(() => {
		if (!companyId) return;

		const scheduleServerRefresh = () => {
			if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
			refreshTimerRef.current = setTimeout(() => router.refresh(), 2500);
		};

		let channel = supabase
			.channel(`tenant-menu-realtime:${companyId}:${selectedBranchId ?? "none"}`)
			.on("postgres_changes", { event: "*", schema: "public", table: "branches", filter: `company_id=eq.${companyId}` }, scheduleServerRefresh)
			.on("postgres_changes", { event: "*", schema: "public", table: "cash_shifts", filter: `company_id=eq.${companyId}` }, scheduleServerRefresh)
			.on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `company_id=eq.${companyId}` }, scheduleServerRefresh)
			.on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `company_id=eq.${companyId}` }, scheduleServerRefresh);

		if (selectedBranchId) {
			channel = channel
				.on("postgres_changes", { event: "*", schema: "public", table: "product_prices", filter: `branch_id=eq.${selectedBranchId}` }, scheduleServerRefresh)
				.on("postgres_changes", { event: "*", schema: "public", table: "product_branch", filter: `branch_id=eq.${selectedBranchId}` }, scheduleServerRefresh)
				.on("postgres_changes", { event: "*", schema: "public", table: "product_extras_groups", filter: `branch_id=eq.${selectedBranchId}` }, scheduleServerRefresh)
				.on("postgres_changes", { event: "*", schema: "public", table: "product_upsell_beverages", filter: `branch_id=eq.${selectedBranchId}` }, scheduleServerRefresh);
		}

		channel.subscribe();
		return () => {
			if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
			supabase.removeChannel(channel);
		};
	}, [supabase, companyId, selectedBranchId, router]);
}
