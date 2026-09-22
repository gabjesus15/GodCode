import { describe, expect, it } from "vitest";

import {
	EMPTY_ENHANCEMENT_CATALOGS,
	parseEnhancementCatalogs,
} from "@/components/tenant/cart/utils/enhancement-catalogs";

const SUPABASE_URL = "https://sb.test";

describe("parseEnhancementCatalogs", () => {
	it("returns empty catalogs for anything that is not an object", () => {
		expect(parseEnhancementCatalogs(null)).toBe(EMPTY_ENHANCEMENT_CATALOGS);
		expect(parseEnhancementCatalogs("{}")).toBe(EMPTY_ENHANCEMENT_CATALOGS);
		expect(parseEnhancementCatalogs([])).toBe(EMPTY_ENHANCEMENT_CATALOGS);
	});

	it("reads both key spellings and normalizes rows", () => {
		const catalogs = parseEnhancementCatalogs(
			{
				beveragesCatalog: [
					{ id: "b1", name: "Coca", price: "1500.4", imageUrl: "  https://img/coca.png " },
					{ id: "", name: "Sin id", price: 100 },
					{ id: "b2", name: "", price: 100 },
					null,
				],
				cartGlobalExtrasCatalog: [{ id: "e1", name: "Cubiertos", price: -5, image_url: "" }],
			},
			SUPABASE_URL,
		);
		expect(catalogs.beverages).toEqual([
			{ id: "b1", name: "Coca", price: 1500, image_url: "https://img/coca.png" },
		]);
		expect(catalogs.globalExtras).toEqual([
			{ id: "e1", name: "Cubiertos", price: 0, image_url: null },
		]);
	});

	it("turns storage object keys into public URLs and drops unusable images", () => {
		const catalogs = parseEnhancementCatalogs(
			{
				cartGlobalExtrasCatalog: [
					{
						id: "queso",
						name: "Queso",
						price: 500,
						image_url: "3c4e/cart-upsell/branch/extras/queso/img 1.png",
					},
					{
						id: "legacy",
						name: "Legacy",
						price: 500,
						image_url: "https://res.cloudinary.com/demo/image/upload/x.png",
					},
					{ id: "weird", name: "Weird", price: 500, image_url: "javascript:alert(1)" },
				],
			},
			SUPABASE_URL,
		);
		expect(catalogs.globalExtras.map((row) => row.image_url)).toEqual([
			"https://sb.test/storage/v1/object/public/menu/3c4e/cart-upsell/branch/extras/queso/img%201.png",
			null,
			null,
		]);
	});

	it("prefers the cart-specific key when both exist", () => {
		const catalogs = parseEnhancementCatalogs({
			cartBeveragesCatalog: [{ id: "cart", name: "Cart", price: 1 }],
			beveragesCatalog: [{ id: "legacy", name: "Legacy", price: 1 }],
		});
		expect(catalogs.beverages.map((row) => row.id)).toEqual(["cart"]);
	});
});
