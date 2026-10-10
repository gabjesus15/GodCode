import { describe, expect, it, vi } from "vitest";

import {
	isMissingColumnError,
	isMissingRelationError,
	omitSelectColumns,
	selectWithOptionalColumns,
	updateWithOptionalColumns,
} from "@/lib/infra/db-compat";
import { isMissingColumnError as reexported } from "@/lib/onboarding/db-compat";

/** Las formas reales de PostgREST cuando falta la columna o la tabla. */
const MISSING_BINANCE_SELECT = { code: "42703", message: "column branches.binance_pay does not exist" };
const MISSING_SOURCE_SELECT = { code: "42703", message: "column branches.exchange_rate_source does not exist" };
const MISSING_BINANCE_WRITE = {
	code: "PGRST204",
	message: "Could not find the 'binance_pay' column of 'branches' in the schema cache",
};
const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };

describe("isMissingColumnError", () => {
	it("reconoce el 42703 del select y el PGRST204 del update que nombran la columna", () => {
		expect(isMissingColumnError(MISSING_BINANCE_SELECT, "binance_pay")).toBe(true);
		expect(isMissingColumnError(MISSING_BINANCE_WRITE, "binance_pay")).toBe(true);
	});

	it("no tapa errores de otra columna ni de otro tipo", () => {
		expect(isMissingColumnError(MISSING_SOURCE_SELECT, "binance_pay")).toBe(false);
		expect(isMissingColumnError(TIMEOUT, "binance_pay")).toBe(false);
		expect(isMissingColumnError({ code: "23514", message: 'violates check constraint "branches_binance_pay_chk"' }, "binance_pay")).toBe(false);
		expect(isMissingColumnError(null, "binance_pay")).toBe(false);
		expect(isMissingColumnError("binance_pay does not exist", "binance_pay")).toBe(false);
	});

	it("exige el nombre completo: una columna que la contiene no cuenta", () => {
		const quoted = { code: "42703", message: "column orders.quoted_exchange_rate_source does not exist" };
		expect(isMissingColumnError(quoted, "exchange_rate_source")).toBe(false);
		expect(isMissingColumnError(quoted, "quoted_exchange_rate_source")).toBe(true);
	});

	it("se sigue importando desde lib/onboarding para el alta y el barrido", () => {
		expect(reexported).toBe(isMissingColumnError);
	});
});

describe("isMissingRelationError", () => {
	it("reconoce la tabla que falta con 42P01 y con PGRST205", () => {
		expect(isMissingRelationError({ code: "42P01", message: 'relation "public.exchange_rates" does not exist' }, "exchange_rates")).toBe(true);
		expect(
			isMissingRelationError(
				{ code: "PGRST205", message: "Could not find the table 'public.exchange_rates' in the schema cache" },
				"exchange_rates",
			),
		).toBe(true);
	});

	it("no confunde una columna que falta en esa tabla ni otra tabla", () => {
		expect(isMissingRelationError({ code: "42703", message: "column exchange_rates.rate does not exist" }, "exchange_rates")).toBe(false);
		expect(isMissingRelationError({ code: "42P01", message: 'relation "public.orders" does not exist' }, "exchange_rates")).toBe(false);
		expect(isMissingRelationError(TIMEOUT, "exchange_rates")).toBe(false);
	});
});

describe("omitSelectColumns", () => {
	it("quita solo las columnas pedidas, con o sin espacios", () => {
		expect(omitSelectColumns("id,binance_pay,name", ["binance_pay"])).toBe("id,name");
		expect(omitSelectColumns("company_id, binance_pay, zelle", ["binance_pay"])).toBe("company_id, zelle");
		expect(omitSelectColumns("id,name", [])).toBe("id,name");
	});
});

/** Un select falso que falla mientras pida alguna de `missing`. */
function fakeSelect(missing: Record<string, { code: string; message: string }>, data: unknown) {
	return vi.fn(async (columns: string) => {
		const listed = columns.split(",").map((column) => column.trim());
		const absent = Object.keys(missing).find((column) => listed.includes(column));
		return absent ? { data: null, error: missing[absent] } : { data, error: null };
	});
}

describe("selectWithOptionalColumns", () => {
	const OPTIONAL = ["binance_pay", "exchange_rate_source"];

	it("con 42703 repite el select sin esa columna y la devuelve en null", async () => {
		const run = fakeSelect({ binance_pay: MISSING_BINANCE_SELECT }, [{ id: "b1", name: "Centro" }]);
		const result = await selectWithOptionalColumns("id,name,binance_pay", OPTIONAL, run);
		expect(run.mock.calls.map(([columns]) => columns)).toEqual(["id,name,binance_pay", "id,name"]);
		expect(result.error).toBeNull();
		expect(result.data).toEqual([{ id: "b1", name: "Centro", binance_pay: null }]);
		expect(result.missingColumns).toEqual(["binance_pay"]);
	});

	it("si faltan las dos (Postgres avisa de a una), las quita en dos reintentos", async () => {
		const run = fakeSelect(
			{ binance_pay: MISSING_BINANCE_SELECT, exchange_rate_source: MISSING_SOURCE_SELECT },
			{ id: "b1" },
		);
		const result = await selectWithOptionalColumns("id,binance_pay,exchange_rate_source", OPTIONAL, run);
		expect(run).toHaveBeenCalledTimes(3);
		expect(run.mock.calls[2][0]).toBe("id");
		expect(result.data).toEqual({ id: "b1", binance_pay: null, exchange_rate_source: null });
		expect(result.missingColumns).toEqual(["binance_pay", "exchange_rate_source"]);
	});

	it("con las columnas en la base no cambia nada: un solo select y las filas tal cual", async () => {
		const rows = [{ id: "b1", binance_pay: '{"pay_id":"123456789"}' }];
		const run = fakeSelect({}, rows);
		const result = await selectWithOptionalColumns("id,binance_pay", OPTIONAL, run);
		expect(run).toHaveBeenCalledTimes(1);
		expect(result.data).toBe(rows);
		expect(result.missingColumns).toEqual([]);
	});

	it("otro error vuelve tal cual, sin reintentos ni filas inventadas", async () => {
		const run = vi.fn(async () => ({ data: null, error: TIMEOUT }));
		const result = await selectWithOptionalColumns("id,binance_pay", OPTIONAL, run);
		expect(run).toHaveBeenCalledTimes(1);
		expect(result.error).toBe(TIMEOUT);
		expect(result.data).toBeNull();
	});

	it("una columna que falta pero no es opcional tampoco se reintenta", async () => {
		const run = vi.fn(async () => ({ data: null, error: { code: "42703", message: "column branches.slug does not exist" } }));
		const result = await selectWithOptionalColumns("id,slug,binance_pay", OPTIONAL, run);
		expect(run).toHaveBeenCalledTimes(1);
		expect(result.error).toMatchObject({ code: "42703" });
	});
});

describe("updateWithOptionalColumns", () => {
	const OPTIONAL = ["binance_pay", "exchange_rate_source"];

	it("no manda las que ya faltaron en el select y guarda el resto", async () => {
		const run = vi.fn(async () => ({ error: null }));
		const result = await updateWithOptionalColumns(
			{ name: "Centro", binance_pay: null, exchange_rate_source: "bcv_eur" },
			OPTIONAL,
			run,
			["binance_pay", "exchange_rate_source"],
		);
		expect(run).toHaveBeenCalledTimes(1);
		expect(run).toHaveBeenCalledWith({ name: "Centro" });
		expect(result.droppedColumns).toEqual(["binance_pay", "exchange_rate_source"]);
	});

	it("con PGRST204 (caché de esquema vieja) repite el update sin esa columna", async () => {
		const run = vi.fn(async (patch: Record<string, unknown>) => ({ error: "binance_pay" in patch ? MISSING_BINANCE_WRITE : null }));
		const result = await updateWithOptionalColumns({ name: "Centro", binance_pay: '{"pay_id":"123456789"}' }, OPTIONAL, run);
		expect(run.mock.calls.map(([patch]) => patch)).toEqual([{ name: "Centro", binance_pay: '{"pay_id":"123456789"}' }, { name: "Centro" }]);
		expect(result.error).toBeNull();
		expect(result.droppedColumns).toEqual(["binance_pay"]);
	});

	it("otro error vuelve tal cual, sin reintentos", async () => {
		const run = vi.fn(async () => ({ error: TIMEOUT }));
		const result = await updateWithOptionalColumns({ name: "Centro", binance_pay: null }, OPTIONAL, run);
		expect(run).toHaveBeenCalledTimes(1);
		expect(result.error).toBe(TIMEOUT);
		expect(result.droppedColumns).toEqual([]);
	});
});
