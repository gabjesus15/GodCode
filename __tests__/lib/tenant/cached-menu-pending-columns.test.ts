import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeOptions } from "../../stubs/fake-supabase";

/**
 * `getCachedMenuStaticData` cuando la base todavía no tiene `branches.binance_pay` (la migración la
 * corre el dueño a mano) y cuando la base falla por otra cosa. El caché imita a `unstable_cache` de
 * Next: guarda lo que resolvió y nada de lo que lanzó.
 */
const holder = vi.hoisted(() => ({ client: undefined as unknown, cache: new Map<string, unknown>() }));

vi.mock("next/cache", () => ({
	unstable_cache:
		(fn: (...args: unknown[]) => Promise<unknown>, keyParts: string[]) =>
		async (...args: unknown[]) => {
			const key = JSON.stringify([keyParts, args]);
			if (holder.cache.has(key)) return holder.cache.get(key);
			const value = await fn(...args);
			holder.cache.set(key, value);
			return value;
		},
}));
vi.mock("@/utils/supabase/server", () => ({
	createSupabasePublicServerClient: () => holder.client,
}));

import { getCachedMenuStaticData } from "@/lib/tenant/cached-menu";

const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };

function branch(overrides: Record<string, unknown> = {}) {
	return {
		id: "b1",
		name: "Centro",
		company_id: "acme",
		is_active: true,
		payment_methods: ["zelle"],
		zelle: '{"email":"pagos@local.com"}',
		country: "VE",
		currency: "USD",
		...overrides,
	};
}

function setup(rows: Record<string, unknown>[], options: FakeOptions = {}) {
	const fake = createFakeSupabase({ branches: rows, business_info: [{ company_id: "acme", schedule: "L a V" }] }, options);
	holder.client = fake.client;
	return fake;
}

function branchSelects(fake: ReturnType<typeof setup>) {
	return fake.selects.filter((entry) => entry.table === "branches").map((entry) => entry.columns);
}

beforeEach(() => holder.cache.clear());

describe("getCachedMenuStaticData: columnas de migraciones pendientes", () => {
	it("sin la migración de Binance Pay (42703) repite el select sin la columna y el menú sigue con sus sucursales", async () => {
		const fake = setup([branch()], { missingColumns: { branches: ["binance_pay"] } });

		const data = await getCachedMenuStaticData("acme", "acme");

		const selects = branchSelects(fake);
		expect(selects).toHaveLength(2);
		expect(selects[0]).toContain("binance_pay");
		expect(selects[1]).not.toContain("binance_pay");
		expect(data.branches).toHaveLength(1);
		expect(data.branches[0]).toMatchObject({ id: "b1", binance_pay: null, zelle: '{"email":"pagos@local.com"}' });
		expect(data.businessInfo).toMatchObject({ schedule: "L a V" });
	});

	it("con la columna en la base no cambia nada: un solo select y Binance Pay tal cual", async () => {
		const fake = setup([branch({ binance_pay: '{"pay_id":"123456789"}' })]);

		const data = await getCachedMenuStaticData("acme", "acme");

		expect(branchSelects(fake)).toHaveLength(1);
		expect(data.branches[0].binance_pay).toBe('{"pay_id":"123456789"}');
	});
});

describe("getCachedMenuStaticData: otro error de la base", () => {
	it("lanza en vez de devolver «sin sucursales», sin reintentar", async () => {
		const fake = setup([branch()], { failures: [{ table: "branches", error: TIMEOUT }] });

		await expect(getCachedMenuStaticData("acme", "acme")).rejects.toThrow(/menu_branches_unavailable: canceling statement/);
		expect(branchSelects(fake)).toHaveLength(1);
	});

	it("el fallo no queda en caché: la visita siguiente vuelve a consultar y ve las sucursales", async () => {
		const options: FakeOptions = { failures: [{ table: "branches", error: TIMEOUT }] };
		const fake = setup([branch()], options);

		await expect(getCachedMenuStaticData("acme", "acme")).rejects.toThrow();
		options.failures = [];
		const recovered = await getCachedMenuStaticData("acme", "acme");
		expect(recovered.branches.map((row) => row.id)).toEqual(["b1"]);

		// Lo que salió bien sí se cachea: la tercera visita no consulta.
		await getCachedMenuStaticData("acme", "acme");
		expect(branchSelects(fake)).toHaveLength(2);
	});
});
