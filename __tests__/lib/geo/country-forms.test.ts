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
