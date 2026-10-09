import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getCurrentExchangeRate } from "@/lib/exchange-rates/current";

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

describe("getCurrentExchangeRate", () => {
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
		const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));
		const result = await getCurrentExchangeRate(client, "bcv_eur", { now: NOW, fetchImpl: fetchImpl as unknown as typeof fetch });
		expect(result).toMatchObject({ rateId: 7, rate: 977.2, stale: true });
	});

	it("devuelve null si nunca hubo tasa y la fuente no responde", async () => {
		const { client } = fakeSupabase(null);
		const fetchImpl = vi.fn(async () => new Response("", { status: 500 }));
		expect(await getCurrentExchangeRate(client, "bcv_usd", { now: NOW, fetchImpl: fetchImpl as unknown as typeof fetch })).toBeNull();
	});
});
