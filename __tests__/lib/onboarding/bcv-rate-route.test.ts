import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentExchangeRate: vi.fn() }));
vi.mock("@/lib/exchange-rates/current", () => ({ getCurrentExchangeRate: mocks.getCurrentExchangeRate }));
vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/infra/api-guard", () => ({ enforceRateLimit: vi.fn(async () => null) }));

import { GET } from "../../../services/onboarding-billing/app/api/onboarding/bcv-rate/route";

const SHARED = {
	source: "bcv_usd",
	rateId: 12,
	rate: 201.47,
	publishedAt: "2026-10-09T04:00:00.000Z",
	checkedAt: "2026-10-09T15:00:00.000Z",
	stale: false,
};

/** dolarapi directo: solo debería llamarse si la tasa compartida no se pudo leer. */
function stubDolarApi(response: Response | Error) {
	const fetchMock = vi.fn(async () => {
		if (response instanceof Error) throw response;
		return response;
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

async function read() {
	const res = await GET(new NextRequest("http://localhost/api/onboarding/bcv-rate"));
	return { body: (await res.json()) as Record<string, unknown>, cache: res.headers.get("Cache-Control") };
}

beforeEach(() => {
	mocks.getCurrentExchangeRate.mockReset();
	vi.stubEnv("BCV_RATE", "");
	vi.stubEnv("NEXT_PUBLIC_BCV_RATE", "");
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("GET /api/onboarding/bcv-rate", () => {
	it("usa la misma tasa que la tienda, sin ir a dolarapi por su cuenta", async () => {
		mocks.getCurrentExchangeRate.mockResolvedValue(SHARED);
		const fetchMock = stubDolarApi(new Error("no debería llamarse"));

		const { body, cache } = await read();

		expect(mocks.getCurrentExchangeRate).toHaveBeenCalledWith(expect.anything(), "bcv_usd");
		expect(fetchMock).not.toHaveBeenCalled();
		expect(body).toEqual({ rate: 201.47, updatedAt: "2026-10-09T04:00:00.000Z", source: "bcv" });
		expect(cache).toContain("s-maxage=60");
	});

	it("con dolarapi caído sirve la última tasa guardada y no la cachea", async () => {
		mocks.getCurrentExchangeRate.mockResolvedValue({ ...SHARED, stale: true });
		vi.stubEnv("BCV_RATE", "180");

		const { body, cache } = await read();

		expect(body).toMatchObject({ rate: 201.47, source: "bcv" });
		expect(cache).toBe("no-store");
	});

	it("sin la tabla de tasas vuelve a leer dolarapi como antes", async () => {
		mocks.getCurrentExchangeRate.mockRejectedValue({ code: "PGRST205", message: "relation exchange_rates does not exist" });
		const fetchMock = stubDolarApi(
			new Response(JSON.stringify({ promedio: 199.9, fechaActualizacion: "2026-10-08T23:00:00.000Z" }), { status: 200 }),
		);

		const { body } = await read();

		expect(fetchMock).toHaveBeenCalledWith("https://ve.dolarapi.com/v1/dolares/oficial", expect.anything());
		expect(body).toEqual({ rate: 199.9, updatedAt: "2026-10-08T23:00:00.000Z", source: "bcv" });
	});

	it("si nada responde, BCV_RATE es el último respaldo", async () => {
		mocks.getCurrentExchangeRate.mockRejectedValue(new Error("sin base"));
		stubDolarApi(new Response("", { status: 503 }));
		vi.stubEnv("BCV_RATE", "180.5");

		const { body, cache } = await read();

		expect(body).toEqual({ rate: 180.5, updatedAt: null, source: "env" });
		expect(cache).toBe("no-store");
	});

	it("sin tasa guardada ni fuente, no vuelve a esperar a dolarapi y usa BCV_RATE", async () => {
		mocks.getCurrentExchangeRate.mockResolvedValue(null);
		const fetchMock = stubDolarApi(new Error("no debería llamarse"));
		vi.stubEnv("BCV_RATE", "180.5");

		expect((await read()).body).toEqual({ rate: 180.5, updatedAt: null, source: "env" });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sin ningún respaldo no inventa un monto", async () => {
		mocks.getCurrentExchangeRate.mockResolvedValue(null);

		expect((await read()).body).toEqual({ rate: null, updatedAt: null, source: null });
	});
});
