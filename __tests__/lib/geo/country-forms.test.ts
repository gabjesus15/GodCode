import { describe, expect, it } from "vitest";

import { getFormStrategy, resolveCheckoutCountryCode } from "@/lib/geo/country-forms";

describe("getFormStrategy", () => {
	it("uses Chile strategy for CL", () => {
		expect(getFormStrategy("CL").idName).toBe("RUT");
	});

	it("uses Venezuela strategy for VE code and country name", () => {
		expect(getFormStrategy("VE").idName).toBe("Cédula / RIF");
		expect(getFormStrategy("Venezuela").idName).toBe("Cédula / RIF");
		expect(getFormStrategy("Venezuela").phonePlaceholder).toContain("+58");
	});
});

describe("resolveCheckoutCountryCode", () => {
	it("keeps Chile for CL branch even with common LATAM payment methods context", () => {
		expect(
			resolveCheckoutCountryCode({
				branchCountry: "CL",
				businessCountry: "CL",
				cartCountry: "CL",
			}),
		).toBe("CL");
		expect(getFormStrategy(
			resolveCheckoutCountryCode({ branchCountry: "Chile" }),
		).phonePrefix).toBe("+56 9 ");
	});

	it("uses Venezuela when branch is VE", () => {
		expect(
			resolveCheckoutCountryCode({ branchCountry: "Venezuela" }),
		).toBe("VE");
	});
});

describe("países sin reglas propias", () => {
	it("EE. UU.: sin documento, teléfono +1 de 10 dígitos y ciudad con ZIP", () => {
		for (const country of ["US", "Estados Unidos", "United States"]) {
			const us = getFormStrategy(country);
			expect(us.requiresId).toBe(false);
			expect(us.validateId("")).toBe(true);
			expect(us.phonePrefix).toBe("+1 ");
			expect(us.address.areaKind).toBe("cityZip");
		}
		const us = getFormStrategy("US");
		expect(us.validatePhone("+1 305 555 0123")).toBe(true);
		expect(us.validatePhone("+1 305 555")).toBe(false);
		expect(us.validatePhone("+56 9 1234 5678")).toBe(false);
		expect(us.normalizePhone("3055550123")).toBe("+1 3055550123");
	});

	it("un país conocido sin reglas propias ya no recibe las de Chile", () => {
		const mx = getFormStrategy("MX");
		expect(mx.requiresId).toBe(false);
		expect(mx.idName).not.toBe("RUT");
		expect(mx.phonePrefix).toBe("+52 ");
		expect(mx.validatePhone("+52 55 1234 5678")).toBe(true);
		expect(mx.validatePhone("+56 9 1234 5678")).toBe(false);
		expect(mx.normalizePhone("5512345678")).toBe("+52 5512345678");
		expect(getFormStrategy("Perú").phonePrefix).toBe("+51 ");
	});

	it("Chile, Venezuela y Colombia siguen pidiendo documento; sin país, Chile como siempre", () => {
		for (const country of ["CL", "VE", "CO"]) expect(getFormStrategy(country).requiresId).toBe(true);
		expect(getFormStrategy(null).idName).toBe("RUT");
		expect(getFormStrategy("Narnia").idName).toBe("RUT");
	});
});
