import { describe, expect, it } from "vitest";

import {
	parseBranchRateResponse,
	resolveBranchExchangeRate,
	type BranchRateLoadState,
} from "@/components/tenant/menu/use-branch-exchange-rate";

const LEGACY = 36.5;

function loaded(result: BranchRateLoadState["result"], branchId = "b1"): BranchRateLoadState {
	return { branchId, result, failed: false };
}

describe("resolveBranchExchangeRate", () => {
	it("fuera de Venezuela no pide nada y conserva la tasa guardada en la sucursal", () => {
		const state = loaded({ source: "bcv_usd", rate: 100 });
		expect(resolveBranchExchangeRate({ enabled: false, branchId: "b1", legacyRate: LEGACY, state })).toBe(LEGACY);
		expect(resolveBranchExchangeRate({ enabled: true, branchId: null, legacyRate: LEGACY, state })).toBe(LEGACY);
	});

	it("mientras carga (o al cambiar de sucursal) devuelve null", () => {
		const initial: BranchRateLoadState = { branchId: null, result: null, failed: false };
		expect(resolveBranchExchangeRate({ enabled: true, branchId: "b1", legacyRate: LEGACY, state: initial })).toBeNull();
		const other = loaded({ source: "bcv_usd", rate: 100 }, "b2");
		expect(resolveBranchExchangeRate({ enabled: true, branchId: "b1", legacyRate: LEGACY, state: other })).toBeNull();
	});

	it("usa la tasa de la fuente cuando la API la tiene", () => {
		const state = loaded({ source: "bcv_eur", rate: 420.1 });
		expect(resolveBranchExchangeRate({ enabled: true, branchId: "b1", legacyRate: LEGACY, state })).toBe(420.1);
	});

	it("si la petición falla cae a la tasa manual antigua", () => {
		const state: BranchRateLoadState = { branchId: "b1", result: null, failed: true };
		expect(resolveBranchExchangeRate({ enabled: true, branchId: "b1", legacyRate: LEGACY, state })).toBe(LEGACY);
		expect(resolveBranchExchangeRate({ enabled: true, branchId: "b1", legacyRate: null, state })).toBeNull();
	});

	it("con fuente pero sin tasa registrada todavía, cae a la tasa manual antigua", () => {
		const state = loaded({ source: "bcv_usd", rate: null });
		expect(resolveBranchExchangeRate({ enabled: true, branchId: "b1", legacyRate: LEGACY, state })).toBe(LEGACY);
	});

	it("si la API dice que la sucursal no tiene fuente, no usa la tasa manual vieja", () => {
		const state = loaded({ source: null, rate: null });
		expect(resolveBranchExchangeRate({ enabled: true, branchId: "b1", legacyRate: LEGACY, state })).toBeNull();
	});
});

describe("parseBranchRateResponse", () => {
	it("lee fuente y tasa de la respuesta de la API", () => {
		expect(parseBranchRateResponse({ ok: true, source: "bcv_usd", rate: { rate: "871.3689", stale: false } })).toEqual({
			source: "bcv_usd",
			rate: 871.3689,
		});
	});

	it("distingue «sin fuente» de «con fuente pero sin tasa»", () => {
		expect(parseBranchRateResponse({ ok: true, source: null, rate: null })).toEqual({ source: null, rate: null });
		expect(parseBranchRateResponse({ ok: true, source: "bcv_eur", rate: null })).toEqual({ source: "bcv_eur", rate: null });
		expect(parseBranchRateResponse({ ok: true, source: "bcv_eur", rate: { rate: 0 } })).toEqual({ source: "bcv_eur", rate: null });
	});

	it("una respuesta rara cuenta como sin fuente", () => {
		expect(parseBranchRateResponse(null)).toEqual({ source: null, rate: null });
		expect(parseBranchRateResponse({ source: "manual", rate: { rate: 50 } })).toEqual({ source: null, rate: null });
	});
});
