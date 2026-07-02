import { describe, expect, it } from "vitest";



import { productCardGridClass } from "@/lib/store-theme/theme-config";



describe("productCardGridClass", () => {

	it("maps card style to grid class", () => {

		expect(productCardGridClass("glass")).toBe("grid-glass");

		expect(productCardGridClass("layout-food")).toBe("grid-layout-food");

		expect(productCardGridClass("layout-horizontal")).toBe("grid-layout-horizontal");

	});



	it("normalizes aliases", () => {

		expect(productCardGridClass("minimal")).toBe("grid-layout-clean");

	});

});

