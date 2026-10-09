import { describe, expect, it, vi } from "vitest";

import {
	fetchExchangeRate,
	isExchangeRateSource,
	parseDolarApiRate,
} from "@/lib/exchange-rates/sources";

const NOW = new Date("2026-10-06T15:00:00.000Z");

describe("parseDolarApiRate", () => {
	it("toma el promedio y la fecha de publicación", () => {
		expect(
			parseDolarApiRate(
				{ moneda: "EUR", fuente: "oficial", promedio: 977.21940683, fechaActualizacion: "2026-10-06T00:00:00-04:00" },
				NOW,
			),
		).toEqual({ rate: 977.21940683, publishedAt: "2026-10-06T04:00:00.000Z" });
	});

	it("usa la hora actual si no viene fecha", () => {
		expect(parseDolarApiRate({ promedio: 871.37 }, NOW)).toEqual({ rate: 871.37, publishedAt: NOW.toISOString() });
	});

	it("descarta tasas vacías, cero o negativas", () => {
		expect(parseDolarApiRate({ promedio: null }, NOW)).toBeNull();
		expect(parseDolarApiRate({ promedio: 0 }, NOW)).toBeNull();
		expect(parseDolarApiRate({ promedio: -3 }, NOW)).toBeNull();
		expect(parseDolarApiRate(null, NOW)).toBeNull();
	});
});

describe("fetchExchangeRate", () => {
	it("consulta el euro oficial para bcv_eur", async () => {
		const fetchImpl = vi.fn(async (_url: string) => new Response(JSON.stringify({ promedio: 977.2 }), { status: 200 }));
		const result = await fetchExchangeRate("bcv_eur", fetchImpl as unknown as typeof fetch);
		expect(result?.rate).toBe(977.2);
		expect(fetchImpl.mock.calls[0][0]).toBe("https://ve.dolarapi.com/v1/euros/oficial");
	});

	it("devuelve null si la fuente falla", async () => {
		const failing = vi.fn(async () => new Response("", { status: 503 }));
		expect(await fetchExchangeRate("bcv_usd", failing as unknown as typeof fetch)).toBeNull();
		const throwing = vi.fn(async () => {
			throw new Error("network");
		});
		expect(await fetchExchangeRate("bcv_usd", throwing as unknown as typeof fetch)).toBeNull();
	});
});

describe("isExchangeRateSource", () => {
	it("solo acepta las fuentes del BCV", () => {
		expect(isExchangeRateSource("bcv_usd")).toBe(true);
		expect(isExchangeRateSource("bcv_eur")).toBe(true);
		expect(isExchangeRateSource("binance_usdt")).toBe(false);
		expect(isExchangeRateSource("manual")).toBe(false);
		expect(isExchangeRateSource(null)).toBe(false);
	});
});
