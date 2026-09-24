import { describe, expect, it } from "vitest";

import { normalizeCountryCode } from "@/lib/geo/country-registry";

describe("normalizeCountryCode", () => {
	it("reconoce nombres con tilde, eñe o espacios", () => {
		expect(normalizeCountryCode("España")).toBe("ES");
		expect(normalizeCountryCode("United States")).toBe("US");
		expect(normalizeCountryCode("Estados Unidos")).toBe("US");
		expect(normalizeCountryCode("México")).toBe("MX");
		expect(normalizeCountryCode("Panamá")).toBe("PA");
	});

	it("acepta códigos ISO y devuelve null si no lo conoce", () => {
		expect(normalizeCountryCode("cl")).toBe("CL");
		expect(normalizeCountryCode("Narnia")).toBeNull();
		expect(normalizeCountryCode("")).toBeNull();
	});
});
