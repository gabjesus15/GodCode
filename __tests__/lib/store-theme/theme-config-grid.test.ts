import { describe, expect, it } from "vitest";



import { productCardGridClass } from "@/lib/store-theme/theme-config";



describe("productCardGridClass", () => {

	it("maps card style to grid class", () => {

		expect(productCardGridClass("glass")).toBe("grid-glass");

		expect(productCardGridClass("glass-row")).toBe("grid-glass-row");

		expect(productCardGridClass("layout-carta")).toBe("grid-layout-carta");

	});



	it("normalizes aliases", () => {

		expect(productCardGridClass("minimal")).toBe("grid-glass");

	});

	it("las tarjetas retiradas caen en una variante de Cristal", () => {

		expect(productCardGridClass("layout-clean")).toBe("grid-glass");

		expect(productCardGridClass("layout-horizontal")).toBe("grid-glass-row");

		expect(productCardGridClass("layout-food")).toBe("grid-glass-plate");

		expect(productCardGridClass("layout-detailed")).toBe("grid-glass-wide");

	});

});

