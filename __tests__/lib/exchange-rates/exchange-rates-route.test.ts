import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeOptions } from "../../stubs/fake-supabase";

/**
 * GET /api/tenant/exchange-rates cuando la base todavía no tiene la migración de tasas
 * (`branches.exchange_rate_source` y la tabla `exchange_rates`): «sin fuente» con 200 y
 * `fallback: true` en vez de un 500 por visita. Otro error sigue siendo 500.
 */
const holder = vi.hoisted(() => ({ admin: undefined as unknown }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return holder.admin;
	},
}));
vi.mock("@/lib/infra/api-guard", () => ({ enforceRateLimit: vi.fn(async () => null) }));

import { GET } from "@/app/api/tenant/exchange-rates/route";
import { __resetExchangeRateBackoff } from "@/lib/exchange-rates/current";

const BRANCH_ID = "44444444-4444-4444-8444-444444444444";
const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };

function setup(branch: Record<string, unknown>, rates: Record<string, unknown>[], options: FakeOptions = {}) {
	const fake = createFakeSupabase({ branches: [{ id: BRANCH_ID, ...branch }], exchange_rates: rates }, options);
	holder.admin = fake.client;
	return fake;
}

async function get(query: string) {
	const res = await GET(new NextRequest(`http://localhost/api/tenant/exchange-rates${query}`));
	return { status: res.status, body: (await res.json()) as Record<string, unknown>, cache: res.headers.get("Cache-Control") };
}

beforeEach(() => {
	__resetExchangeRateBackoff();
	// Ninguna de estas pruebas debe salir a dolarapi.
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => {
			throw new Error("no debería consultar dolarapi");
		}),
	);
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("GET /api/tenant/exchange-rates sin la migración de tasas", () => {
	it("sin la columna (42703) responde «sin fuente» con 200 y fallback para que el menú use su tasa manual", async () => {
		setup({ country: "VE" }, [], { missingColumns: { branches: ["exchange_rate_source"] }, missingTables: ["exchange_rates"] });

		const res = await get(`?branchId=${BRANCH_ID}`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, source: null, rate: null, fallback: true });
		expect(res.cache).toContain("s-maxage=60");
	});

	it("con fuente pero sin la tabla `exchange_rates` responde lo mismo", async () => {
		setup({ exchange_rate_source: "bcv_usd" }, [], { missingTables: ["exchange_rates"] });

		const res = await get(`?branchId=${BRANCH_ID}`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, source: null, rate: null, fallback: true });
	});

	it("la lista de las dos fuentes (Panel) sin la tabla responde vacía con 200", async () => {
		setup({}, [], { missingTables: ["exchange_rates"] });

		const res = await get("");

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true, rates: {}, fallback: true });
	});
});

describe("GET /api/tenant/exchange-rates: otros errores y el caso normal", () => {
	it("otro error de la base sigue siendo 500 y no se cachea", async () => {
		setup({ exchange_rate_source: "bcv_usd" }, [], { failures: [{ table: "branches", error: TIMEOUT }] });

		const res = await get(`?branchId=${BRANCH_ID}`);

		expect(res.status).toBe(500);
		expect(res.body).toEqual({ ok: false, error: "exchange_rate_unavailable" });
		expect(res.cache).toBe("no-store");
	});

	it("con la migración aplicada responde la tasa guardada, sin fallback", async () => {
		const checkedAt = new Date().toISOString();
		setup({ exchange_rate_source: "bcv_eur" }, [
			{ id: 9, source: "bcv_eur", rate: 420.5, published_at: checkedAt, checked_at: checkedAt },
		]);

		const res = await get(`?branchId=${BRANCH_ID}`);

		expect(res.status).toBe(200);
		expect(res.body).toMatchObject({ ok: true, source: "bcv_eur", rate: { rateId: 9, rate: 420.5, stale: false } });
		expect(res.body).not.toHaveProperty("fallback");
	});

	it("una sucursal sin fuente sigue respondiendo «sin fuente», sin fallback", async () => {
		setup({ exchange_rate_source: null }, []);

		const res = await get(`?branchId=${BRANCH_ID}`);

		expect(res.body).toEqual({ ok: true, source: null, rate: null });
	});
});
