import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
	EXCHANGE_RATE_SOURCES,
	EXCHANGE_RATE_TTL_MS,
	fetchExchangeRate,
	type ExchangeRateSource,
} from "./sources";

export type StoredExchangeRate = {
	source: ExchangeRateSource;
	rateId: number;
	rate: number;
	publishedAt: string;
	checkedAt: string;
	/** true si la fuente no respondió y se devuelve el último valor conocido. */
	stale: boolean;
};

type Row = { id: number; source: string; rate: number | string; published_at: string; checked_at: string };

/**
 * Tras un fallo de la fuente no se vuelve a consultar durante este tiempo: cada visita
 * al menú con la tasa vencida pedía a dolarapi otra vez y esperaba el timeout completo.
 */
export const EXCHANGE_RATE_FETCH_BACKOFF_MS = 5 * 60 * 1000;

/** Último fallo por fuente (ms desde epoch). Vive en memoria: por instancia del servidor. */
const lastFailureAt = new Map<ExchangeRateSource, number>();

/** Solo para tests: olvida los fallos memorizados. */
export function __resetExchangeRateBackoff() {
	lastFailureAt.clear();
}

function toStored(row: Row, stale: boolean): StoredExchangeRate {
	return {
		source: row.source as ExchangeRateSource,
		rateId: Number(row.id),
		rate: Number(row.rate),
		publishedAt: row.published_at,
		checkedAt: row.checked_at,
		stale,
	};
}

async function latestRow(supabase: SupabaseClient, source: ExchangeRateSource): Promise<Row | null> {
	const { data, error } = await supabase
		.from("exchange_rates")
		.select("id, source, rate, published_at, checked_at")
		.eq("source", source)
		.order("id", { ascending: false })
		.limit(1)
		.maybeSingle();
	if (error) throw error;
	return (data as Row | null) ?? null;
}

/**
 * Tasa vigente de una fuente. Si la guardada tiene más que su TTL, consulta la fuente y
 * la registra (una fila nueva solo si el valor cambió). Si la fuente no responde,
 * devuelve la última guardada marcada como `stale` y no la vuelve a consultar hasta
 * pasados `EXCHANGE_RATE_FETCH_BACKOFF_MS`.
 */
export async function getCurrentExchangeRate(
	supabase: SupabaseClient,
	source: ExchangeRateSource,
	options: { now?: number; fetchImpl?: typeof fetch } = {},
): Promise<StoredExchangeRate | null> {
	const now = options.now ?? Date.now();
	const last = await latestRow(supabase, source);
	if (last && now - Date.parse(last.checked_at) < EXCHANGE_RATE_TTL_MS[source]) {
		return toStored(last, false);
	}

	const failedAt = lastFailureAt.get(source);
	if (failedAt != null && now - failedAt < EXCHANGE_RATE_FETCH_BACKOFF_MS) {
		return last ? toStored(last, true) : null;
	}

	const fetched = await fetchExchangeRate(source, options.fetchImpl);
	if (!fetched) {
		lastFailureAt.set(source, now);
		return last ? toStored(last, true) : null;
	}
	lastFailureAt.delete(source);

	const { data, error } = await supabase.rpc("record_exchange_rate", {
		p_source: source,
		p_rate: fetched.rate,
		p_published_at: fetched.publishedAt,
	});
	if (error || !data) return last ? toStored(last, true) : null;
	return toStored(data as Row, false);
}

export async function getAllCurrentExchangeRates(
	supabase: SupabaseClient,
	options: { now?: number; fetchImpl?: typeof fetch } = {},
): Promise<Partial<Record<ExchangeRateSource, StoredExchangeRate>>> {
	const entries = await Promise.all(
		EXCHANGE_RATE_SOURCES.map(async (source) => [source, await getCurrentExchangeRate(supabase, source, options)] as const),
	);
	const out: Partial<Record<ExchangeRateSource, StoredExchangeRate>> = {};
	for (const [source, rate] of entries) if (rate) out[source] = rate;
	return out;
}
