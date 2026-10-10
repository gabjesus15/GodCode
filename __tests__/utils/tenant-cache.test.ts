import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeOptions } from "../stubs/fake-supabase";

/**
 * `getCachedCompany` (la tienda de todas las páginas públicas) cuando la base falla. El caché imita
 * a `unstable_cache` de Next: guarda lo que resolvió y nada de lo que lanzó.
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

import { getCachedCompany } from "@/utils/tenant-cache";
import { resolveTenantPreferredLocale } from "@/lib/i18n/tenant-locale";

const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };

const RICA_PIZZA = {
	id: "c1",
	name: "Rica Pizza",
	public_slug: "rica-pizza",
	country: "Brasil",
	subscription_status: "active",
	theme_config: {},
	plans: { features: {} },
};

function setup(options: FakeOptions = {}) {
	holder.client = createFakeSupabase({ companies: [RICA_PIZZA] }, options).client;
}

function tenantHeaders(slug: string) {
	return new Headers({ host: "localhost:3000", "x-tenant-slug": slug });
}

beforeEach(() => holder.cache.clear());

describe("getCachedCompany", () => {
	it("devuelve la tienda por su slug y null si no existe", async () => {
		setup();
		await expect(getCachedCompany("rica-pizza")).resolves.toMatchObject({ id: "c1" });
		await expect(getCachedCompany("no-existe")).resolves.toBeNull();
	});

	it("si la base falla lanza en vez de responder «no existe», y no deja ese fallo en caché", async () => {
		setup({ failures: [{ table: "companies", op: "select", error: TIMEOUT }] });
		await expect(getCachedCompany("rica-pizza")).rejects.toThrow(/tenant_company_unavailable/);

		// La base vuelve: la visita siguiente ve la tienda (antes quedaba 5 minutos como 404).
		setup();
		await expect(getCachedCompany("rica-pizza")).resolves.toMatchObject({ id: "c1" });
	});
});

describe("resolveTenantPreferredLocale con la base caída", () => {
	it("no rompe el layout raíz: sin la tienda, sigue con el idioma del navegador", async () => {
		setup({ failures: [{ table: "companies", op: "select", error: TIMEOUT }] });
		await expect(resolveTenantPreferredLocale(tenantHeaders("rica-pizza"))).resolves.toBeNull();
	});

	it("con la base bien, usa el país de la tienda", async () => {
		setup();
		await expect(resolveTenantPreferredLocale(tenantHeaders("rica-pizza"))).resolves.toBe("pt");
	});
});
