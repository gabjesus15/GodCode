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
 * devuelve la última guardada marcada como `stale`.
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

	const fetched = await fetchExchangeRate(source, options.fetchImpl);
	if (!fetched) return last ? toStored(last, true) : null;

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
