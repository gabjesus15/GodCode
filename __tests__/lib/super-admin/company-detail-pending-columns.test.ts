import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeOptions } from "../../stubs/fake-supabase";

/**
 * La ficha de una empresa en el súper admin cuando la base todavía no tiene `branches.binance_pay`
 * ni `branches.exchange_rate_source` (migraciones que corre el dueño a mano): antes el 42703 dejaba
 * toda la ficha en «No se pudo cargar».
 */
const holder = vi.hoisted(() => ({ admin: undefined as unknown }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return holder.admin;
	},
}));
vi.mock("@/lib/email/deliveries", () => ({ listCompanyDeliveries: vi.fn(async () => null) }));
vi.mock("@/lib/storage/storefront-branding", () => ({ resolveStorefrontThemeAssets: vi.fn(async () => ({})) }));

import { loadCompanyDetail } from "@/lib/super-admin/company-detail";

const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };

function setup(branch: Record<string, unknown>, options: FakeOptions = {}) {
	const fake = createFakeSupabase(
		{
			companies: [{ id: "acme", name: "Acme", public_slug: "acme", subscription_status: "active", country: "VE" }],
			business_info: [],
			branches: [{ id: "b1", company_id: "acme", name: "Centro", country: "VE", ...branch }],
			plans: [],
			payments_history: [],
			company_plan_change_schedules: [],
		},
		options,
	);
	holder.admin = fake.client;
	return fake;
}

function branchSelects(fake: ReturnType<typeof setup>) {
	return fake.selects.filter((entry) => entry.table === "branches").map((entry) => entry.columns);
}

describe("loadCompanyDetail: sucursales sin las migraciones de Binance Pay y de tasas", () => {
	beforeEach(() => {
		holder.admin = undefined;
	});

	it("con 42703 repite el select sin las columnas nuevas y la ficha carga con ellas en null", async () => {
		const fake = setup({}, { missingColumns: { branches: ["binance_pay", "exchange_rate_source"] } });

		const detail = await loadCompanyDetail("acme");

		expect(detail.status).toBe("ok");
		const selects = branchSelects(fake);
		expect(selects).toHaveLength(3);
		expect(selects[2]).not.toMatch(/binance_pay|exchange_rate_source/);
		if (detail.status !== "ok") return;
		expect(detail.branches).toEqual([expect.objectContaining({ id: "b1", binance_pay: null, exchange_rate_source: null })]);
	});

	it("con las columnas en la base, un solo select y los datos tal cual", async () => {
		const fake = setup({ binance_pay: '{"pay_id":"123456789"}', exchange_rate_source: "bcv_usd" });

		const detail = await loadCompanyDetail("acme");

		expect(branchSelects(fake)).toHaveLength(1);
		if (detail.status !== "ok") throw new Error(`status ${detail.status}`);
		expect(detail.branches[0]).toMatchObject({ binance_pay: '{"pay_id":"123456789"}', exchange_rate_source: "bcv_usd" });
	});

	it("otro error no se reintenta ni se esconde: la ficha queda en error", async () => {
		const fake = setup({}, { failures: [{ table: "branches", error: TIMEOUT }] });

		const detail = await loadCompanyDetail("acme");

		expect(branchSelects(fake)).toHaveLength(1);
		expect(detail).toEqual({ status: "error", error: TIMEOUT });
	});
});
