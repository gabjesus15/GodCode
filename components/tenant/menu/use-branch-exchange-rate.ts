"use client";

import { useEffect, useState } from "react";

import { isExchangeRateSource, type ExchangeRateSource } from "@/lib/exchange-rates/sources";

/** Cuánto se reutiliza la tasa ya pedida entre el menú y el carrito. */
const CLIENT_CACHE_MS = 60_000;

/** Lo que respondió `/api/tenant/exchange-rates?branchId=` para una sucursal. */
export type BranchRateResponse = {
	/** `null`: la sucursal no tiene fuente (fuera de Venezuela, o aún sin elegir). */
	source: ExchangeRateSource | null;
	/** `null` con fuente: la base todavía no registró ninguna tasa. */
	rate: number | null;
	/**
	 * `true`: a la base le falta la migración de tasas y no se sabe la fuente de la sucursal. No es
	 * «sin fuente»: se usa la tasa manual de respaldo, como cuando la petición falla.
	 */
	fallback?: true;
};

type CacheEntry = { result: BranchRateResponse | null; at: number; pending?: Promise<BranchRateResponse> };
const cache = new Map<string, CacheEntry>();

/** Lee la respuesta de la API; cualquier forma inesperada cuenta como «sin fuente». */
export function parseBranchRateResponse(data: unknown): BranchRateResponse {
	const record = (data && typeof data === "object" ? data : {}) as {
		source?: unknown;
		rate?: { rate?: unknown } | null;
		fallback?: unknown;
	};
	if (record.fallback === true) return { source: null, rate: null, fallback: true };
	if (!isExchangeRateSource(record.source)) return { source: null, rate: null };
	const rate = Number(record.rate?.rate);
	return { source: record.source, rate: Number.isFinite(rate) && rate > 0 ? rate : null };
}

async function requestBranchRate(branchId: string): Promise<BranchRateResponse> {
	const res = await fetch(`/api/tenant/exchange-rates?branchId=${encodeURIComponent(branchId)}`, {
		headers: { Accept: "application/json" },
	});
	if (!res.ok) throw new Error(`exchange_rates_${res.status}`);
	return parseBranchRateResponse(await res.json());
}

function loadBranchRate(branchId: string): Promise<BranchRateResponse> {
	const hit = cache.get(branchId);
	if (hit?.pending) return hit.pending;
	if (hit?.result && Date.now() - hit.at < CLIENT_CACHE_MS) return Promise.resolve(hit.result);
	const pending = requestBranchRate(branchId)
		.then((result) => {
			cache.set(branchId, { result, at: Date.now() });
			return result;
		})
		.catch((error) => {
			cache.delete(branchId);
			throw error;
		});
	cache.set(branchId, { result: hit?.result ?? null, at: hit?.at ?? 0, pending });
	return pending;
}

export type BranchRateLoadState = {
	/** Sucursal a la que pertenece `result`; otra distinta significa «cargando». */
	branchId: string | null;
	result: BranchRateResponse | null;
	/** La petición falló (red, 5xx): no se sabe qué fuente tiene la sucursal. */
	failed: boolean;
};

/**
 * Qué tasa mostrar. `legacyRate` (la tasa manual que la sucursal guardaba antes en
 * `delivery_settings.exchangeRate`) solo entra cuando no hay forma de saber la de la
 * fuente: la petición falló, a la base le falta la migración de tasas (`fallback`), o la
 * sucursal tiene fuente pero la base aún no tiene tasa.
 * Si la API dice `source: null` no hay nada que convertir: se devuelve `null`, no la
 * tasa manual vieja, que podía llevar meses sin actualizarse.
 */
export function resolveBranchExchangeRate(params: {
	enabled: boolean;
	branchId: string | null | undefined;
	legacyRate: number | null;
	state: BranchRateLoadState;
}): number | null {
	const { enabled, branchId, legacyRate, state } = params;
	if (!enabled || !branchId) return legacyRate;
	if (state.branchId !== branchId) return null;
	if (state.failed || !state.result || state.result.fallback) return legacyRate;
	if (state.result.source == null) return null;
	return state.result.rate ?? legacyRate;
}

/**
 * Tasa de la fuente que eligió la sucursal (BCV dólar o BCV euro), la misma en el menú
 * y en el carrito. Fuera de Venezuela (`enabled: false`) no se pide nada y se devuelve
 * `legacyRate` tal cual. Mientras carga devuelve `null`; ver `resolveBranchExchangeRate`
 * para cuándo entra la tasa manual antigua.
 */
export function useBranchExchangeRate(
	branchId: string | null | undefined,
	options: { enabled: boolean; legacyRate?: number | null },
): number | null {
	const { enabled, legacyRate = null } = options;
	const [state, setState] = useState<BranchRateLoadState>({ branchId: null, result: null, failed: false });

	useEffect(() => {
		if (!enabled || !branchId) return;
		let cancelled = false;
		loadBranchRate(branchId)
			.then((result) => {
				if (!cancelled) setState({ branchId, result, failed: false });
			})
			.catch(() => {
				if (!cancelled) setState({ branchId, result: null, failed: true });
			});
		return () => {
			cancelled = true;
		};
	}, [branchId, enabled]);

	return resolveBranchExchangeRate({ enabled, branchId, legacyRate, state });
}
