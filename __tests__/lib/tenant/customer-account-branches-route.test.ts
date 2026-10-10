import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFakeSupabase, type FakeOptions } from "../../stubs/fake-supabase";
import { makeAdminMock, type TableQueues } from "../menu-account/test-supabase-mock";

type AdminMock = ReturnType<typeof makeAdminMock>;

/** El mock se arma por test (cola de resultados por tabla); `vi.hoisted` porque `vi.mock` sube al inicio. */
const holder = vi.hoisted(() => ({ admin: undefined as unknown as { from: unknown } }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return holder.admin;
	},
}));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));
vi.mock("@/lib/tenant/customer-account-rate-limit", () => ({
	assertCustomerAccountRateLimit: vi.fn(async () => null),
}));
vi.mock("@/lib/tenant/customer-account-context", () => ({
	getCustomerAccountContext: vi.fn(async () => ({
		authUserId: "auth-1",
		userId: "user-1",
		email: "ceo@local.ve",
		companyId: "acme",
		role: "ceo",
	})),
}));

import { PUT } from "@/app/api/customer-account/branches/route";
import { logger } from "@/lib/infra/logger";

const BRANCH_ID = "22222222-2222-4222-8222-222222222222";

function branchRow(overrides: Record<string, unknown> = {}) {
	return {
		data: {
			company_id: "acme",
			country: "VE",
			exchange_rate_source: "bcv_usd",
			order_intake_paused: false,
			pago_movil: null,
			zelle: null,
			binance_pay: null,
			transferencia_bancaria: null,
			mercadopago: null,
			paypal: null,
			...overrides,
		},
		error: null,
	};
}

function setup(branch: Record<string, unknown> = {}, extra: TableQueues = {}): AdminMock {
	const admin = makeAdminMock({
		tables: {
			branches: [branchRow(branch), { data: null, error: null }],
			companies: [{ data: { country: "VE" }, error: null }],
			branch_exchange_rate_source_changes: [{ data: null, error: null }],
			payment_methods: [{ data: [], error: null }, { data: null, error: null }],
			...extra,
		},
	});
	holder.admin = admin;
	return admin;
}

function admin(): AdminMock {
	return holder.admin as AdminMock;
}

function put(body: Record<string, unknown>) {
	return PUT(
		new NextRequest("http://localhost/api/customer-account/branches", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: BRANCH_ID, name: "Centro", payment_methods: [], ...body }),
		}),
	);
}

type Fn = ReturnType<typeof vi.fn>;

/** Primer argumento con el que se llamó a `update` sobre `branches`. */
function branchUpdatePayload() {
	const chain = admin().chains.find((entry) => entry.table === "branches" && (entry.chain.update as Fn).mock.calls.length > 0);
	return (chain?.chain.update as Fn).mock.calls[0][0] as Record<string, unknown>;
}

function changesInsertPayload() {
	const chain = admin().chains.find((entry) => entry.table === "branch_exchange_rate_source_changes");
	if (!chain) return undefined;
	return (chain.chain.insert as Fn).mock.calls[0]?.[0] as Record<string, unknown> | undefined;
}

describe("PUT /api/customer-account/branches: fuente de la tasa de cambio", () => {
	beforeEach(() => setup());

	it("guarda la fuente nueva y registra el cambio con el usuario de la sesión", async () => {
		const res = await put({ exchange_rate_source: "bcv_eur" });
		expect(res.status).toBe(200);
		expect(branchUpdatePayload()).toMatchObject({ exchange_rate_source: "bcv_eur" });
		expect(changesInsertPayload()).toEqual({
			company_id: "acme",
			branch_id: BRANCH_ID,
			old_source: "bcv_usd",
			new_source: "bcv_eur",
			changed_by: "auth-1",
		});
	});

	it("si la fuente es la misma no toca la columna ni escribe en el historial", async () => {
		const res = await put({ exchange_rate_source: "bcv_usd" });
		expect(res.status).toBe(200);
		expect(branchUpdatePayload()).not.toHaveProperty("exchange_rate_source");
		expect(changesInsertPayload()).toBeUndefined();
	});

	it("rechaza una fuente que no es del BCV con error de campo", async () => {
		const res = await put({ exchange_rate_source: "binance_usdt" });
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ field: "exchange_rate_source" });
		expect(admin().fromCalls).not.toContain("branches");
	});

	it("fuera de Venezuela ignora el campo (el modal no lo muestra)", async () => {
		setup({ country: "CL" }, { companies: [{ data: { country: "CL" }, error: null }] });
		const res = await put({ exchange_rate_source: "bcv_eur" });
		expect(res.status).toBe(200);
		expect(branchUpdatePayload()).not.toHaveProperty("exchange_rate_source");
		expect(changesInsertPayload()).toBeUndefined();
	});

	it("usa el país del negocio cuando la sucursal no tiene el suyo", async () => {
		setup({ country: null, exchange_rate_source: null });
		const res = await put({ exchange_rate_source: "bcv_eur" });
		expect(res.status).toBe(200);
		expect(admin().fromCalls).toContain("companies");
		expect(branchUpdatePayload()).toMatchObject({ exchange_rate_source: "bcv_eur" });
		expect(changesInsertPayload()).toMatchObject({ old_source: null, new_source: "bcv_eur" });
	});

	it("sin el campo en el cuerpo no cambia nada", async () => {
		const res = await put({});
		expect(res.status).toBe(200);
		expect(branchUpdatePayload()).not.toHaveProperty("exchange_rate_source");
		expect(admin().fromCalls).not.toContain("branch_exchange_rate_source_changes");
	});
});

describe("PUT /api/customer-account/branches: Pay ID de Binance", () => {
	beforeEach(() => setup());

	it("rechaza un Pay ID con letras antes de tocar la sucursal", async () => {
		const res = await put({ payment_methods: ["binance_pay"], binance_pay: { pay_id: "pagos@x.com", email: "b@x.com", name: null } });
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ field: "binance_pay.pay_id" });
		expect(admin().fromCalls).not.toContain("branches");
	});

	it("acepta un Pay ID numérico y lo guarda", async () => {
		const res = await put({ payment_methods: ["binance_pay"], binance_pay: { pay_id: "123456789", email: null, name: null } });
		expect(res.status).toBe(200);
		expect(JSON.parse(String(branchUpdatePayload().binance_pay))).toEqual({ pay_id: "123456789" });
	});
});

/**
 * Sin `branches.binance_pay` ni `branches.exchange_rate_source` (ni la tabla del historial): las
 * migraciones las corre el dueño a mano y la app puede llegar antes. Base en memoria que responde
 * 42703 / PGRST204 como PostgREST según las columnas que se piden.
 */
describe("PUT /api/customer-account/branches sin las migraciones de Binance Pay y de tasas", () => {
	const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };
	const BOTH_MISSING: FakeOptions = {
		missingColumns: { branches: ["binance_pay", "exchange_rate_source"] },
		missingTables: ["branch_exchange_rate_source_changes"],
	};

	let warned: ReturnType<typeof vi.spyOn>;
	let loggedError: ReturnType<typeof vi.spyOn>;

	function setupDb(options: FakeOptions) {
		const fake = createFakeSupabase(
			{
				branches: [
					{
						id: BRANCH_ID,
						company_id: "acme",
						name: "Centro",
						country: "VE",
						order_intake_paused: false,
						pago_movil: null,
						zelle: null,
						transferencia_bancaria: null,
						mercadopago: null,
						paypal: null,
					},
				],
				companies: [{ id: "acme", country: "VE" }],
				payment_methods: [],
			},
			options,
		);
		const from = vi.spyOn(fake.client, "from");
		holder.admin = fake.client;
		return { ...fake, from };
	}

	beforeEach(() => {
		warned = vi.spyOn(logger, "warn").mockImplementation(() => {});
		loggedError = vi.spyOn(logger, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		warned.mockRestore();
		loggedError.mockRestore();
	});

	it("el guardado de siempre de una sucursal de Venezuela (tasa por defecto, sin Binance) responde ok", async () => {
		const fake = setupDb(BOTH_MISSING);

		// El modal manda «Dólar BCV» por defecto: la migración se lo pondrá igual a esta sucursal.
		const res = await put({ name: "Centro nuevo", exchange_rate_source: "bcv_usd", binance_pay: null });

		expect(res.status).toBe(200);
		expect(fake.db.branches[0].name).toBe("Centro nuevo");
		const update = fake.log.find((entry) => entry.table === "branches" && entry.op === "update")?.patch as Record<string, unknown>;
		expect(update).not.toHaveProperty("binance_pay");
		expect(update).not.toHaveProperty("exchange_rate_source");
		// Dos selects fallidos (uno por columna) y el bueno; el update ya no las mandó.
		expect(fake.selects.filter((entry) => entry.table === "branches")).toHaveLength(3);
		expect(fake.from.mock.calls.map(([table]) => table)).not.toContain("branch_exchange_rate_source_changes");
		expect(warned).toHaveBeenCalledWith(
			"branch_pending_migration_columns",
			expect.objectContaining({ columns: ["binance_pay", "exchange_rate_source"] }),
		);
	});

	it("con datos de Binance Pay guarda el resto y avisa que falta su migración", async () => {
		const fake = setupDb(BOTH_MISSING);

		const res = await put({ name: "Centro nuevo", payment_methods: ["binance_pay"], binance_pay: { pay_id: "123456789" } });

		expect(res.status).toBe(503);
		expect(await res.json()).toEqual({
			error: "Falta aplicar la migración de Binance Pay en la base, así que sus datos no se guardaron. El resto de la sucursal sí se guardó.",
		});
		expect(fake.db.branches[0]).toMatchObject({ name: "Centro nuevo", payment_methods: ["binance_pay"] });
		expect(fake.db.branches[0]).not.toHaveProperty("binance_pay");
	});

	it("elegir Euro BCV sin la migración de tasas avisa y no escribe el historial", async () => {
		const fake = setupDb(BOTH_MISSING);

		const res = await put({ name: "Centro nuevo", exchange_rate_source: "bcv_eur" });

		expect(res.status).toBe(503);
		expect((await res.json()).error).toMatch(/^Falta aplicar la migración de tasas de cambio en la base/);
		expect(fake.db.branches[0].name).toBe("Centro nuevo");
		expect(fake.from.mock.calls.map(([table]) => table)).not.toContain("branch_exchange_rate_source_changes");
	});

	it("otro error al leer la sucursal responde 500 (no «Sucursal no encontrada») y no guarda nada", async () => {
		const fake = setupDb({ failures: [{ table: "branches", op: "select", error: TIMEOUT }] });

		const res = await put({ name: "Centro nuevo" });

		expect(res.status).toBe(500);
		expect(await res.json()).toEqual({ error: "No se pudo leer la sucursal. Intenta de nuevo." });
		expect(fake.selects.filter((entry) => entry.table === "branches")).toHaveLength(1);
		expect(fake.log.filter((entry) => entry.table === "branches")).toHaveLength(0);
		expect(loggedError).toHaveBeenCalledWith("customer_account_branch_read_failed", expect.objectContaining({ code: "57014" }));
	});
});
