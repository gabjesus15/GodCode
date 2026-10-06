/**
 * Fuentes de tasa de cambio que puede elegir una sucursal de Venezuela.
 *
 * Todas expresan cuántos bolívares vale una unidad de precio del catálogo, que en
 * Venezuela siempre está en dólares. El euro BCV se aplica igual a los precios en
 * dólares: hay locales que cobran así, y la contabilidad sigue en dólares.
 */
export const EXCHANGE_RATE_SOURCES = ["bcv_usd", "bcv_eur", "binance_usdt"] as const;

export type ExchangeRateSource = (typeof EXCHANGE_RATE_SOURCES)[number];

export const DEFAULT_EXCHANGE_RATE_SOURCE: ExchangeRateSource = "bcv_usd";

export const EXCHANGE_RATE_SOURCE_LABELS: Record<ExchangeRateSource, string> = {
	bcv_usd: "Dólar BCV",
	bcv_eur: "Euro BCV",
	binance_usdt: "Binance (USDT)",
};

/**
 * Cada cuánto se vuelve a consultar una fuente. El BCV publica una vez al día; el P2P de
 * Binance se mueve todo el día.
 */
export const EXCHANGE_RATE_TTL_MS: Record<ExchangeRateSource, number> = {
	bcv_usd: 60 * 60 * 1000,
	bcv_eur: 60 * 60 * 1000,
	binance_usdt: 10 * 60 * 1000,
};

export function isExchangeRateSource(value: unknown): value is ExchangeRateSource {
	return typeof value === "string" && (EXCHANGE_RATE_SOURCES as readonly string[]).includes(value);
}

export type FetchedRate = { rate: number; publishedAt: string };

const DOLARAPI_BCV_USD = "https://ve.dolarapi.com/v1/dolares/oficial";
const DOLARAPI_BCV_EUR = "https://ve.dolarapi.com/v1/euros/oficial";
/** Promedio de compra y venta del P2P de Binance para 1 USDT, según CriptoYa. */
const CRIPTOYA_BINANCE_USDT_VES = "https://criptoya.com/api/binancep2p/USDT/VES/1";

const FETCH_TIMEOUT_MS = 5000;

function positiveNumber(value: unknown): number | null {
	const n = typeof value === "string" ? Number(value) : value;
	return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

/** `{ promedio, fechaActualizacion }` de dolarapi. */
export function parseDolarApiRate(data: unknown, now: Date = new Date()): FetchedRate | null {
	if (!data || typeof data !== "object") return null;
	const record = data as { promedio?: unknown; fechaActualizacion?: unknown };
	const rate = positiveNumber(record.promedio);
	if (rate == null) return null;
	const published =
		typeof record.fechaActualizacion === "string" && !Number.isNaN(Date.parse(record.fechaActualizacion))
			? new Date(record.fechaActualizacion).toISOString()
			: now.toISOString();
	return { rate, publishedAt: published };
}

/** `{ ask, bid, time }` de CriptoYa (time en segundos). */
export function parseCriptoYaRate(data: unknown, now: Date = new Date()): FetchedRate | null {
	if (!data || typeof data !== "object") return null;
	const record = data as { ask?: unknown; bid?: unknown; time?: unknown };
	const ask = positiveNumber(record.ask);
	const bid = positiveNumber(record.bid);
	const rate = ask != null && bid != null ? (ask + bid) / 2 : (ask ?? bid);
	if (rate == null) return null;
	const seconds = positiveNumber(record.time);
	const published = seconds != null ? new Date(seconds * 1000) : now;
	return { rate, publishedAt: published.toISOString() };
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<unknown> {
	const res = await fetchImpl(url, {
		cache: "no-store",
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
	});
	if (!res.ok) return null;
	return res.json();
}

/** Consulta una fuente; devuelve null si no responde o la respuesta no sirve. */
export async function fetchExchangeRate(
	source: ExchangeRateSource,
	fetchImpl: typeof fetch = fetch,
): Promise<FetchedRate | null> {
	try {
		switch (source) {
			case "bcv_usd":
				return parseDolarApiRate(await fetchJson(DOLARAPI_BCV_USD, fetchImpl));
			case "bcv_eur":
				return parseDolarApiRate(await fetchJson(DOLARAPI_BCV_EUR, fetchImpl));
			case "binance_usdt":
				return parseCriptoYaRate(await fetchJson(CRIPTOYA_BINANCE_USDT_VES, fetchImpl));
		}
	} catch {
		return null;
	}
}
