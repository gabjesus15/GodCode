import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeOptions } from "../../stubs/fake-supabase";

/**
 * PUT /api/super-admin/branches/[id] cuando la base todavía no tiene `branches.binance_pay` ni
 * `branches.exchange_rate_source` (ni la tabla del historial de tasas): migraciones que corre el
 * dueño a mano. El resto de la sucursal se guarda; si lo que no entró era un cambio de verdad, se
 * avisa con un error claro.
 */
const holder = vi.hoisted(() => ({ admin: undefined as unknown, audit: [] as Array<Record<string, unknown>> }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return holder.admin;
	},
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/utils/admin/server-auth", () => ({
	SAAS_MUTATE_ROLES: ["super_admin"],
	validateAdminRolesOnServer: vi.fn(async () => ({ ok: true, email: "root@gcode.test", role: "super_admin" })),
}));
vi.mock("@/lib/super-admin/admin-audit", () => ({
	logAdminAudit: vi.fn(async (entry: Record<string, unknown>) => {
		holder.audit.push(entry);
	}),
}));

import { PUT } from "@/app/api/super-admin/branches/[id]/route";
import { logger } from "@/lib/infra/logger";

const BRANCH_ID = "33333333-3333-4333-8333-333333333333";
const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };
const BOTH_MISSING: FakeOptions = {
	missingColumns: { branches: ["binance_pay", "exchange_rate_source"] },
	missingTables: ["branch_exchange_rate_source_changes"],
};

function setup(branch: Record<string, unknown> = {}, options: FakeOptions = {}) {
	const fake = createFakeSupabase(
		{
			branches: [
				{
					id: BRANCH_ID,
					company_id: "acme",
					name: "Centro",
					country: "VE",
					delivery_settings: null,
					payment_methods: ["zelle"],
					pago_movil: null,
					zelle: null,
					transferencia_bancaria: null,
					stripe: null,
					mercadopago: null,
					paypal: null,
					efectivo: null,
					tarjeta: null,
					...branch,
				},
			],
			branch_exchange_rate_source_changes: [],
		},
		options,
	);
	const from = vi.spyOn(fake.client, "from");
	holder.admin = fake.client;
	return { ...fake, from };
}

async function put(body: Record<string, unknown>) {
	const res = await PUT(
		new NextRequest(`http://localhost/api/super-admin/branches/${BRANCH_ID}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
		{ params: Promise.resolve({ id: BRANCH_ID }) },
	);
	return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

function branchUpdates(fake: ReturnType<typeof setup>) {
	return fake.log.filter((entry) => entry.table === "branches" && entry.op === "update").map((entry) => entry.patch as Record<string, unknown>);
}

function tablesTouched(fake: ReturnType<typeof setup>) {
	return fake.from.mock.calls.map(([table]) => table);
}

let warned: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	holder.audit = [];
	warned = vi.spyOn(logger, "warn").mockImplementation(() => {});
});

afterEach(() => {
	warned.mockRestore();
});

describe("PUT /api/super-admin/branches/[id] sin las migraciones de Binance Pay y de tasas", () => {
	it("guarda el resto y, si traía datos de Binance Pay, responde un error claro", async () => {
		const fake = setup({}, BOTH_MISSING);

		const res = await put({ name: "Centro nuevo", payment_methods: ["zelle", "binance_pay"], binance_pay: { pay_id: "123456789" } });

		expect(res.status).toBe(503);
		expect(res.body.error).toBe(
			"Falta aplicar la migración de Binance Pay en la base, así que sus datos no se guardaron. El resto de la sucursal sí se guardó.",
		);
		expect(fake.db.branches[0]).toMatchObject({ name: "Centro nuevo", payment_methods: ["zelle", "binance_pay"] });
		const updates = branchUpdates(fake);
		expect(updates).toHaveLength(1);
		expect(updates[0]).not.toHaveProperty("binance_pay");
		expect(warned).toHaveBeenCalledWith("branch_pending_migration_columns", expect.objectContaining({ columns: ["binance_pay"] }));
	});

	it("un guardado sin datos de Binance Pay ni tasa responde ok", async () => {
		const fake = setup({}, BOTH_MISSING);

		const res = await put({ name: "Centro nuevo", binance_pay: { pay_id: "", email: "", name: "" } });

		expect(res.status).toBe(200);
		expect(res.body).toEqual({ ok: true });
		expect(fake.db.branches[0].name).toBe("Centro nuevo");
		// El select falló dos veces (una por columna) y el update ya no las mandó.
		expect(fake.selects.filter((entry) => entry.table === "branches")).toHaveLength(3);
		expect(branchUpdates(fake)).toHaveLength(1);
	});

	it("elegir Euro BCV sin la migración de tasas avisa, no toca el historial y la auditoría no inventa el cambio", async () => {
		const fake = setup({}, BOTH_MISSING);

		const res = await put({ name: "Centro nuevo", exchange_rate_source: "bcv_eur" });

		expect(res.status).toBe(503);
		expect(res.body.error).toBe(
			"Falta aplicar la migración de tasas de cambio en la base, así que la tasa elegida no se guardó. El resto de la sucursal sí se guardó.",
		);
		expect(fake.db.branches[0].name).toBe("Centro nuevo");
		expect(tablesTouched(fake)).not.toContain("branch_exchange_rate_source_changes");
		expect(holder.audit[0].metadata).not.toHaveProperty("exchange_rate_source");
	});

	it("si falta solo una de las dos, la otra se guarda como siempre", async () => {
		const fake = setup({ exchange_rate_source: "bcv_usd" }, { missingColumns: { branches: ["binance_pay"] } });

		const res = await put({ exchange_rate_source: "bcv_eur" });

		expect(res.status).toBe(200);
		expect(fake.db.branches[0].exchange_rate_source).toBe("bcv_eur");
		expect(fake.db.branch_exchange_rate_source_changes).toEqual([
			expect.objectContaining({ branch_id: BRANCH_ID, old_source: "bcv_usd", new_source: "bcv_eur" }),
		]);
	});
});

describe("PUT /api/super-admin/branches/[id]: otros errores no se esconden", () => {
	it("si falla la lectura por otra cosa responde 500 sin reintentar ni guardar", async () => {
		const fake = setup({}, { failures: [{ table: "branches", op: "select", error: TIMEOUT }] });

		const res = await put({ name: "Centro nuevo" });

		expect(res.status).toBe(500);
		expect(res.body.error).toBe(TIMEOUT.message);
		expect(fake.selects.filter((entry) => entry.table === "branches")).toHaveLength(1);
		expect(branchUpdates(fake)).toHaveLength(0);
	});

	it("si falla el guardado por otra cosa responde 500 sin reintentar", async () => {
		const fake = setup({}, { failures: [{ table: "branches", op: "update", error: TIMEOUT }] });

		const res = await put({ name: "Centro nuevo", binance_pay: { pay_id: "123456789" } });

		expect(res.status).toBe(500);
		expect(tablesTouched(fake).filter((table) => table === "branches")).toHaveLength(2);
		expect(fake.db.branches[0].name).toBe("Centro");
	});
});

describe("PUT /api/super-admin/branches/[id] con las migraciones aplicadas", () => {
	it("guarda Binance Pay y la tasa, y registra el cambio, como siempre", async () => {
		const fake = setup({ binance_pay: null, exchange_rate_source: "bcv_usd" });

		const res = await put({ binance_pay: { pay_id: "123456789" }, exchange_rate_source: "bcv_eur" });

		expect(res.status).toBe(200);
		expect(JSON.parse(String(fake.db.branches[0].binance_pay))).toEqual({ pay_id: "123456789" });
		expect(fake.db.branches[0].exchange_rate_source).toBe("bcv_eur");
		expect(fake.db.branch_exchange_rate_source_changes).toHaveLength(1);
		expect(holder.audit[0].metadata).toMatchObject({ exchange_rate_source: { from: "bcv_usd", to: "bcv_eur" } });
		expect(warned).not.toHaveBeenCalled();
	});
});
