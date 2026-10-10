import { isValidElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Mi cuenta (`/cuenta`) cuando la base todavía no tiene `branches.binance_pay` ni
 * `branches.exchange_rate_source` (migraciones que corre el dueño a mano), y cuando el select de
 * sucursales falla por otra cosa. Solo importa qué sucursales llegan al cliente.
 */
const db = vi.hoisted(() => ({
	branches: [] as Record<string, unknown>[],
	missingBranchColumns: [] as string[],
	branchesFailure: null as null | { code: string; message: string },
	branchSelects: [] as string[],
}));

vi.mock("@/lib/infra/supabase-admin", () => {
	function result(table: string, columns: string) {
		if (table !== "branches") return { data: null, error: null, count: 0 };
		db.branchSelects.push(columns);
		if (db.branchesFailure) return { data: null, error: db.branchesFailure };
		const absent = columns
			.split(",")
			.map((column) => column.trim())
			.find((column) => db.missingBranchColumns.includes(column));
		if (absent) return { data: null, error: { code: "42703", message: `column branches.${absent} does not exist` } };
		return { data: db.branches.map((row) => ({ ...row })), error: null };
	}
	return {
		supabaseAdmin: {
			from: (table: string) => {
				let columns = "*";
				const query: Record<string, unknown> = {};
				for (const method of ["eq", "neq", "in", "or", "order", "limit", "maybeSingle", "single"]) query[method] = () => query;
				query.select = (selected?: string) => {
					columns = selected ?? "*";
					return query;
				};
				query.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
					Promise.resolve(result(table, columns)).then(resolve, reject);
				return query;
			},
		},
	};
});
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("next/navigation", () => ({
	redirect: (url: string) => {
		throw new Error(`REDIRECT ${url}`);
	},
}));
vi.mock("@/lib/tenant/customer-portal-session", () => ({
	requireCustomerPortalSession: async () => ({ membership: { companyId: "acme" } }),
}));
vi.mock("@/lib/i18n/server", () => ({ getCurrentLocale: async () => "es" }));
vi.mock("@/lib/tenant/customer-account-billing", () => ({
	getCustomerAccountBillingContext: async () => null,
	buildBillingOptionsResponse: () => null,
}));
vi.mock("@/lib/menu/create-menu-items", () => ({
	getMenuStatus: async () => ({ productCount: 0, sampleCount: 0, categoryCount: 0 }),
}));
vi.mock("@/lib/menu/ai-menu-import", () => ({ isMenuImportEnabled: () => false }));
vi.mock("@/app/(customer-portal)/cuenta/CustomerAccountClient", () => ({ CustomerAccountClient: () => null }));

import CustomerAccountPage from "@/app/(customer-portal)/cuenta/page";
import { logger } from "@/lib/infra/logger";

const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };

/** Las sucursales que la página le pasa al cliente. `tab` evita la redirección a «Configura tu tienda». */
async function renderedBranches() {
	const element = await CustomerAccountPage({ searchParams: Promise.resolve({ tab: "sucursales" }) });
	if (!isValidElement(element)) throw new Error("la página no devolvió un elemento");
	return (element.props as { branches: Array<Record<string, unknown>> }).branches;
}

let loggedError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	db.branches = [{ id: "b1", name: "Centro", country: "VE", payment_methods: ["pago_movil"] }];
	db.missingBranchColumns = [];
	db.branchesFailure = null;
	db.branchSelects = [];
	loggedError = vi.spyOn(logger, "error").mockImplementation(() => {});
});

afterEach(() => {
	loggedError.mockRestore();
});

describe("/cuenta: sucursales sin las migraciones de Binance Pay y de tasas", () => {
	it("con 42703 repite el select sin las columnas nuevas y muestra las sucursales con ellas en null", async () => {
		db.missingBranchColumns = ["binance_pay", "exchange_rate_source"];

		const branches = await renderedBranches();

		expect(db.branchSelects).toHaveLength(3);
		expect(db.branchSelects[0]).toContain("binance_pay");
		expect(db.branchSelects[2]).not.toMatch(/binance_pay|exchange_rate_source/);
		expect(branches).toEqual([expect.objectContaining({ id: "b1", binance_pay: null, exchange_rate_source: null })]);
		expect(loggedError).not.toHaveBeenCalled();
	});

	it("con las columnas en la base, un solo select y los datos tal cual", async () => {
		db.branches = [{ id: "b1", name: "Centro", binance_pay: '{"pay_id":"123456789"}', exchange_rate_source: "bcv_eur" }];

		const branches = await renderedBranches();

		expect(db.branchSelects).toHaveLength(1);
		expect(branches[0]).toMatchObject({ binance_pay: '{"pay_id":"123456789"}', exchange_rate_source: "bcv_eur" });
	});

	it("otro error no se reintenta ni se esconde: queda en el log (y el resto de Mi cuenta sigue)", async () => {
		db.branchesFailure = TIMEOUT;

		const branches = await renderedBranches();

		expect(db.branchSelects).toHaveLength(1);
		expect(branches).toEqual([]);
		expect(loggedError).toHaveBeenCalledWith(
			"customer_account_branches_load_failed",
			expect.objectContaining({ companyId: "acme", code: "57014" }),
		);
	});
});
