import { describe, expect, it } from "vitest";

import { getFormStrategy } from "@/lib/geo/country-forms";

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
