"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchInfo } from "../cart-modal-types";

type LiveBranchPatch = Pick<
	BranchInfo,
	| "payment_methods"
	| "delivery_settings"
	| "efectivo"
	| "tarjeta"
	| "order_intake_paused"
	| "order_intake_pause_message"
	| "order_intake_paused_at"
>;

type PoliciesPayload = {
	methods?: Array<{ id?: string; requiresReceipt?: boolean }>;
};

export type CheckoutBranchLive = {
	/** Sucursal con los cambios en vivo del panel aplicados encima. */
	branch: BranchInfo | null;
	/** Métodos que exigen comprobante según la política persistida; `null` mientras no llega. */
	receiptRequiredMethods: ReadonlySet<string> | null;
	shiftOpen: boolean;
	shiftLoading: boolean;
};

/**
 * Todo lo que el checkout escucha de la sucursal mientras el carrito está abierto:
 * cambios del admin (métodos de pago, delivery, pausa), la política de comprobantes
 * y si hay una caja abierta. Cada dato se guarda junto con la sucursal a la que
 * pertenece, así cambiar de sucursal lo invalida sin efectos de reseteo.
 */
export function useCheckoutBranchLive(params: {
	branch: BranchInfo | null | undefined;
	isCartOpen: boolean;
	supabase: SupabaseClient;
}): CheckoutBranchLive {
	const { branch, isCartOpen, supabase } = params;
	const branchId = branch?.id ?? null;

	const [livePatch, setLivePatch] = useState<{ branchId: string; patch: LiveBranchPatch } | null>(
		null,
	);
	const [policies, setPolicies] = useState<{ key: string; methods: Set<string> } | null>(null);
	const [shift, setShift] = useState<{ branchId: string; open: boolean } | null>(null);

	useEffect(() => {
		if (!branchId || !isCartOpen) return;
		const channel = supabase
			.channel(`tenant-cart-checkout-branch:${branchId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "branches", filter: `id=eq.${branchId}` },
				(payload: unknown) => {
					const next = (payload as { new?: unknown }).new;
					if (!next || typeof next !== "object") return;
					const row = next as Record<string, unknown>;
					setLivePatch({
						branchId,
						patch: {
							payment_methods:
								row.payment_methods === null
									? undefined
									: (row.payment_methods as string[] | undefined),
							delivery_settings: row.delivery_settings as BranchInfo["delivery_settings"],
							efectivo: row.efectivo,
							tarjeta: row.tarjeta,
							order_intake_paused: row.order_intake_paused as boolean | null | undefined,
							order_intake_pause_message: row.order_intake_pause_message as
								| string
								| null
								| undefined,
							order_intake_paused_at: row.order_intake_paused_at as string | null | undefined,
						},
					});
				},
			);
		channel.subscribe();
		return () => {
			supabase.removeChannel(channel);
		};
	}, [supabase, branchId, isCartOpen]);

	const liveBranch = useMemo<BranchInfo | null>(() => {
		if (!branch) return null;
		if (!livePatch || livePatch.branchId !== branch.id) return branch;
		return { ...branch, ...livePatch.patch };
	}, [branch, livePatch]);

	// La política puede cambiar cuando el admin edita los métodos: la clave lo refleja.
	const policiesKey = branchId
		? `${branchId}:${(liveBranch?.payment_methods ?? []).join(",")}`
		: "";

	useEffect(() => {
		if (!policiesKey || !branchId || !isCartOpen) return;
		const controller = new AbortController();
		fetch(`/api/tenant/payment-method-policies?branchId=${encodeURIComponent(branchId)}`, {
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("payment_method_policies_unavailable");
				return (await response.json()) as PoliciesPayload;
			})
			.then((payload) => {
				const methods = new Set(
					(payload.methods ?? [])
						.filter((method) => method.requiresReceipt)
						.map((method) => String(method.id ?? "").trim())
						.filter(Boolean),
				);
				setPolicies({ key: policiesKey, methods });
			})
			.catch(() => {
				/* sin política persistida: el caller cae al listado por defecto */
			});
		return () => controller.abort();
	}, [policiesKey, branchId, isCartOpen]);

	useEffect(() => {
		if (!branchId || !isCartOpen) return;
		let cancelled = false;
		const refresh = async () => {
			const { data, error } = await supabase
				.from("cash_shifts")
				.select("id")
				.eq("status", "open")
				.eq("branch_id", branchId)
				.maybeSingle();
			if (cancelled) return;
			setShift({ branchId, open: !error && Boolean(data) });
		};
		void refresh().catch(() => {
			if (!cancelled) setShift({ branchId, open: false });
		});
		const channel = supabase
			.channel(`cart-shift-realtime:${branchId}`)
			.on(
				"postgres_changes",
				{ event: "*", schema: "public", table: "cash_shifts", filter: `branch_id=eq.${branchId}` },
				() => {
					void refresh().catch(() => {
						if (!cancelled) setShift({ branchId, open: false });
					});
				},
			)
			.subscribe();
		return () => {
			cancelled = true;
			supabase.removeChannel(channel);
		};
	}, [supabase, branchId, isCartOpen]);

	const shiftKnown = Boolean(branchId) && shift?.branchId === branchId;

	return {
		branch: liveBranch,
		receiptRequiredMethods: policies?.key === policiesKey ? policies.methods : null,
		shiftOpen: shiftKnown ? Boolean(shift?.open) : false,
		shiftLoading: isCartOpen && Boolean(branchId) && !shiftKnown,
	};
}
