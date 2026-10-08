"use client";

import { useEffect, useState } from "react";

/** Cuánto se reutiliza la tasa ya pedida entre el menú y el carrito. */
const CLIENT_CACHE_MS = 60_000;

type CacheEntry = { rate: number | null; at: number; pending?: Promise<number | null> };
const cache = new Map<string, CacheEntry>();

async function requestBranchRate(branchId: string): Promise<number | null> {
	const res = await fetch(`/api/tenant/exchange-rates?branchId=${encodeURIComponent(branchId)}`, {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) throw new Error(`exchange_rates_${res.status}`);
	const data = (await res.json()) as { rate?: { rate?: unknown } | null };
	const rate = Number(data.rate?.rate);
	return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function loadBranchRate(branchId: string): Promise<number | null> {
	const hit = cache.get(branchId);
	if (hit?.pending) return hit.pending;
	if (hit && Date.now() - hit.at < CLIENT_CACHE_MS) return Promise.resolve(hit.rate);
	const pending = requestBranchRate(branchId)
		.then((rate) => {
			cache.set(branchId, { rate, at: Date.now() });
			return rate;
		})
		.catch((error) => {
			cache.delete(branchId);
			throw error;
		});
	cache.set(branchId, { rate: hit?.rate ?? null, at: hit?.at ?? 0, pending });
	return pending;
}

/**
 * Tasa de la fuente que eligió la sucursal (BCV dólar o BCV euro), la misma en
 * el menú y en el carrito.
 *
 * Si el servidor no responde, o la base todavía no tiene la migración de tasas, se usa
 * `legacyRate` (la tasa que la sucursal tenía guardada antes) para no dejar de mostrar
 * los bolívares.
 */
export function useBranchExchangeRate(
	branchId: string | null | undefined,
	options: { enabled: boolean; legacyRate?: number | null },
): number | null {
	const { enabled, legacyRate = null } = options;
	const [state, setState] = useState<{ branchId: string | null; rate: number | null; failed: boolean }>({
		branchId: null,
		rate: null,
		failed: false,
	});

	useEffect(() => {
		if (!enabled || !branchId) return;
		let cancelled = false;
		loadBranchRate(branchId)
			.then((rate) => {
				if (!cancelled) setState({ branchId, rate, failed: false });
			})
			.catch(() => {
				if (!cancelled) setState({ branchId, rate: null, failed: true });
			});
		return () => {
			cancelled = true;
		};
	}, [branchId, enabled]);

	if (!enabled || !branchId) return legacyRate;
	if (state.branchId !== branchId) return null;
	if (state.failed || state.rate == null) return legacyRate;
	return state.rate;
}

/** Solo para tests. */
export function __resetBranchExchangeRateCache() {
	cache.clear();
}
