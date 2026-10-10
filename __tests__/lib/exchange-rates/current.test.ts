import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
	__resetExchangeRateBackoff,
	EXCHANGE_RATE_FETCH_BACKOFF_MS,
	getCurrentExchangeRate,
	isExchangeRatesTableMissing,
} from "@/lib/exchange-rates/current";

type Row = { id: number; source: string; rate: number; published_at: string; checked_at: string };

function fakeSupabase(last: Row | null, recorded?: Row) {
	const rpc = vi.fn(async () => ({ data: recorded ?? null, error: recorded ? null : { message: "x" } }));
	const query = {
		select: () => query,
		eq: () => query,
		order: () => query,
		limit: () => query,
		maybeSingle: async () => ({ data: last, error: null }),
	};
	return { client: { from: () => query, rpc } as unknown as SupabaseClient, rpc };
}

const NOW = Date.parse("2026-10-06T15:00:00.000Z");

const failingFetch = () => vi.fn(async () => new Response("", { status: 500 })) as unknown as typeof fetch & ReturnType<typeof vi.fn>;

describe("getCurrentExchangeRate", () => {
	// El backoff vive en memoria del módulo: cada test parte sin fallos recordados.
	beforeEach(() => __resetExchangeRateBackoff());

	it("devuelve la guardada si no venció, sin consultar la fuente", async () => {
		const last = { id: 7, source: "bcv_usd", rate: 871.3689, published_at: "2026-10-05T04:00:00.000Z", checked_at: "2026-10-06T14:30:00.000Z" };
		const { client, rpc } = fakeSupabase(last);
		const fetchImpl = vi.fn();
		const result = await getCurrentExchangeRate(client, "bcv_usd", { now: NOW, fetchImpl: fetchImpl as unknown as typeof fetch });
		expect(result).toMatchObject({ rateId: 7, rate: 871.3689, stale: false });
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(rpc).not.toHaveBeenCalled();
	});

	it("consulta y registra la tasa cuando la guardada venció", async () => {
		const last = { id: 7, source: "bcv_eur", rate: 990, published_at: "2026-10-06T14:00:00.000Z", checked_at: "2026-10-06T14:00:00.000Z" };
		const recorded = { id: 8, source: "bcv_eur", rate: 995, published_at: "2026-10-06T14:59:00.000Z", checked_at: "2026-10-06T15:00:00.000Z" };
		const { client, rpc } = fakeSupabase(last, recorded);
		const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ promedio: 995 }), { status: 200 }));
		const result = await getCurrentExchangeRate(client, "bcv_eur", { now: NOW, fetchImpl: fetchImpl as unknown as typeof fetch });
		expect(rpc).toHaveBeenCalledWith("record_exchange_rate", expect.objectContaining({ p_source: "bcv_eur", p_rate: 995 }));
		expect(result).toMatchObject({ rateId: 8, rate: 995, stale: false });
	});

	it("devuelve la última conocida marcada como vieja si la fuente no responde", async () => {
		const last = { id: 7, source: "bcv_eur", rate: 977.2, published_at: "2026-10-05T04:00:00.000Z", checked_at: "2026-10-05T12:00:00.000Z" };
		const { client } = fakeSupabase(last);
		const result = await getCurrentExchangeRate(client, "bcv_eur", { now: NOW, fetchImpl: failingFetch() });
		expect(result).toMatchObject({ rateId: 7, rate: 977.2, stale: true });
	});

	it("devuelve null si nunca hubo tasa y la fuente no responde", async () => {
		const { client } = fakeSupabase(null);
		expect(await getCurrentExchangeRate(client, "bcv_usd", { now: NOW, fetchImpl: failingFetch() })).toBeNull();
	});

	describe("backoff tras un fallo de la fuente", () => {
		const last = { id: 7, source: "bcv_usd", rate: 871.3689, published_at: "2026-10-05T04:00:00.000Z", checked_at: "2026-10-05T12:00:00.000Z" };

		it("no vuelve a consultar durante cinco minutos: dos fallos seguidos, una sola llamada real", async () => {
			const { client, rpc } = fakeSupabase(last);
			const fetchImpl = failingFetch();
			const first = await getCurrentExchangeRate(client, "bcv_usd", { now: NOW, fetchImpl });
			const second = await getCurrentExchangeRate(client, "bcv_usd", { now: NOW + 60_000, fetchImpl });
			expect(fetchImpl).toHaveBeenCalledTimes(1);
			expect(first).toMatchObject({ rateId: 7, stale: true });
			expect(second).toMatchObject({ rateId: 7, stale: true });
			expect(rpc).not.toHaveBeenCalled();
		});

		it("sin tasa guardada sigue devolviendo null, sin consultar otra vez", async () => {
			const { client } = fakeSupabase(null);
			const fetchImpl = failingFetch();
			expect(await getCurrentExchangeRate(client, "bcv_usd", { now: NOW, fetchImpl })).toBeNull();
			expect(await getCurrentExchangeRate(client, "bcv_usd", { now: NOW + 1_000, fetchImpl })).toBeNull();
			expect(fetchImpl).toHaveBeenCalledTimes(1);
		});

		it("vuelve a consultar cuando pasó el backoff y olvida el fallo si responde", async () => {
			const recorded = { id: 8, source: "bcv_usd", rate: 880, published_at: "2026-10-06T04:00:00.000Z", checked_at: "2026-10-06T15:06:00.000Z" };
			const { client } = fakeSupabase(last, recorded);
			const fetchImpl = vi
				.fn()
				.mockResolvedValueOnce(new Response("", { status: 500 }))
				.mockResolvedValue(new Response(JSON.stringify({ promedio: 880 }), { status: 200 })) as unknown as typeof fetch;

			await getCurrentExchangeRate(client, "bcv_usd", { now: NOW, fetchImpl });
			const later = NOW + EXCHANGE_RATE_FETCH_BACKOFF_MS;
			const result = await getCurrentExchangeRate(client, "bcv_usd", { now: later, fetchImpl });
			expect(fetchImpl).toHaveBeenCalledTimes(2);
			expect(result).toMatchObject({ rateId: 8, rate: 880, stale: false });

			// Tras el acierto, un nuevo vencimiento consulta de inmediato (no queda backoff).
			await getCurrentExchangeRate(client, "bcv_usd", { now: later + 1_000, fetchImpl });
			expect(fetchImpl).toHaveBeenCalledTimes(3);
		});

		it("el fallo de una fuente no frena a la otra", async () => {
			const usd = fakeSupabase(last);
			const fetchUsd = failingFetch();
			await getCurrentExchangeRate(usd.client, "bcv_usd", { now: NOW, fetchImpl: fetchUsd });

			const eurLast = { id: 9, source: "bcv_eur", rate: 990, published_at: "2026-10-05T04:00:00.000Z", checked_at: "2026-10-05T12:00:00.000Z" };
			const eurRecorded = { ...eurLast, id: 10, rate: 995, checked_at: "2026-10-06T15:00:00.000Z" };
			const eur = fakeSupabase(eurLast, eurRecorded);
			const fetchEur = vi.fn(async () => new Response(JSON.stringify({ promedio: 995 }), { status: 200 }));
			const result = await getCurrentExchangeRate(eur.client, "bcv_eur", { now: NOW, fetchImpl: fetchEur as unknown as typeof fetch });
			expect(fetchEur).toHaveBeenCalledTimes(1);
			expect(result).toMatchObject({ rateId: 10, stale: false });
		});
	});
});

describe("getCurrentExchangeRate sin la migración de tasas", () => {
	beforeEach(() => __resetExchangeRateBackoff());

	/** La tabla `exchange_rates` todavía no existe: PostgREST 12+ responde PGRST205. */
	function missingTableSupabase() {
		const rpc = vi.fn();
		const query = {
			select: () => query,
			eq: () => query,
			order: () => query,
			limit: () => query,
			maybeSingle: async () => ({
				data: null,
				error: { code: "PGRST205", message: "Could not find the table 'public.exchange_rates' in the schema cache" },
			}),
		};
		return { client: { from: () => query, rpc } as unknown as SupabaseClient, rpc };
	}

	it("lanza el error tal cual, sin consultar la fuente: el alta cae a dolarapi y la tienda responde «sin fuente»", async () => {
		const { client, rpc } = missingTableSupabase();
		const fetchImpl = vi.fn();

		const failure = await getCurrentExchangeRate(client, "bcv_usd", { now: NOW, fetchImpl: fetchImpl as unknown as typeof fetch }).catch(
			(error: unknown) => error,
		);

		expect(isExchangeRatesTableMissing(failure)).toBe(true);
		expect(fetchImpl).not.toHaveBeenCalled();
		expect(rpc).not.toHaveBeenCalled();
	});

	it("isExchangeRatesTableMissing no confunde otros errores de la base", () => {
		expect(isExchangeRatesTableMissing({ code: "42P01", message: 'relation "public.exchange_rates" does not exist' })).toBe(true);
		expect(isExchangeRatesTableMissing({ code: "57014", message: "canceling statement due to statement timeout" })).toBe(false);
		expect(isExchangeRatesTableMissing({ code: "42703", message: "column exchange_rates.rate does not exist" })).toBe(false);
		expect(isExchangeRatesTableMissing(new Error("sin base"))).toBe(false);
	});
});
