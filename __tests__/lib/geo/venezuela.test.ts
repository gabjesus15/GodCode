import { describe, expect, it } from "vitest";

import { isVenezuelaCountry, isVenezuelaCurrency } from "@/lib/geo/venezuela";

describe("isVenezuelaCountry", () => {
	it("acepta el código y el nombre en cualquier forma", () => {
		for (const value of ["VE", "ve", " Ve ", "Venezuela", "venezuela", "VENEZUELA", "República Bolivariana de Venezuela"]) {
			expect(isVenezuelaCountry(value), value).toBe(true);
		}
	});

	it("rechaza otros países y valores vacíos", () => {
		for (const value of ["CL", "Chile", "VEN", "", "  ", null, undefined]) {
			expect(isVenezuelaCountry(value), String(value)).toBe(false);
		}
	});
});

describe("isVenezuelaCurrency", () => {
	it("solo reconoce el bolívar", () => {
		expect(isVenezuelaCurrency("VES")).toBe(true);
		expect(isVenezuelaCurrency(" ves ")).toBe(true);
		expect(isVenezuelaCurrency("USD")).toBe(false);
		expect(isVenezuelaCurrency(null)).toBe(false);
	});
});
