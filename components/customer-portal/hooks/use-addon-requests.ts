"use client";

import { useCallback, useState } from "react";

import type { AddonRequestDraft, AddonRequestSummary, OwnerAddonRequestAction } from "@/lib/billing/addon-requests";

type Result = { ok: true; message?: string; addonId?: string | null } | { ok: false; error: string };

async function send(method: "POST" | "PATCH", body: unknown) {
	try {
		const res = await fetch("/api/customer-account/addon-requests", {
			method,
			cache: "no-store",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});
		const data = (await res.json().catch(() => ({}))) as {
			error?: string;
			message?: string;
			addonId?: string | null;
			requests?: AddonRequestSummary[];
		};
		if (!res.ok) return { ok: false as const, error: data.error ?? "Algo salió mal. Intenta de nuevo." };
		return { ok: true as const, data };
	} catch {
		return { ok: false as const, error: "No pudimos conectar. Revisa tu conexión." };
	}
}

/** Pedidos de extras a medida del dueño (/cuenta › Plan y extras). */
export function useAddonRequests(initial: AddonRequestSummary[]) {
	const [requests, setRequests] = useState(initial);
	const [busyId, setBusyId] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			const res = await fetch("/api/customer-account/addon-requests", { cache: "no-store" });
			if (!res.ok) return;
			const data = (await res.json()) as { requests?: AddonRequestSummary[] };
			if (data.requests) setRequests(data.requests);
		} catch {
			// Sin conexión: queda la lista que había.
		}
	}, []);

	const create = useCallback(async (draft: AddonRequestDraft): Promise<Result> => {
		setBusyId("new");
		const result = await send("POST", draft);
		setBusyId(null);
		if (!result.ok) return result;
		if (result.data.requests) setRequests(result.data.requests);
		return { ok: true, message: result.data.message };
	}, []);

	const act = useCallback(async (id: string, action: OwnerAddonRequestAction): Promise<Result> => {
		setBusyId(id);
		const result = await send("PATCH", { id, action });
		setBusyId(null);
		if (!result.ok) return result;
		if (result.data.requests) setRequests(result.data.requests);
		return { ok: true, addonId: result.data.addonId ?? null };
	}, []);

	return { requests, busyId, refresh, create, act };
}

export type AddonRequestsState = ReturnType<typeof useAddonRequests>;
