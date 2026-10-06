import { describe, expect, it } from "vitest";

import { MENU_DRAFT_MAX_PRODUCTS, normalizeMenuDraft, parseMenuPrice } from "@/lib/menu/menu-draft";
import { buildSampleMenu, isSampleProduct, resolveSampleSector, SAMPLE_MENU_SECTORS, sampleLocalPrice } from "@/lib/menu/sample-menus";

describe("parseMenuPrice", () => {
	it.each([
		["8.990", 8990],
		["$ 8.990", 8990],
		["12,50", 12.5],
		["12.5", 12.5],
		["1.234,5", 1234.5],
		["1,234", 1234],
		["US$ 10", 10],
		[15, 15],
	])("lee %s como %s", (raw, expected) => {
		expect(parseMenuPrice(raw)).toBe(expected);
	});

	it.each([["gratis"], [""], [0], [-3], [null], ["0"]])("rechaza %s", (raw) => {
		expect(parseMenuPrice(raw)).toBeNull();
	});
});

describe("normalizeMenuDraft", () => {
	it("limpia textos, junta categorías repetidas y descarta filas sin precio o repetidas", () => {
		const result = normalizeMenuDraft({
			categories: [
				{ name: "  Pizzas ", products: [{ name: " Margarita ", description: "  tomate   y queso ", price: "8.990" }] },
				{ name: "pizzas", products: [{ name: "margarita", price: "9.990" }, { name: "Napolitana", price: "9.490" }] },
				{ name: "", products: [{ name: "Sin categoría", price: 3 }, { name: "Sin precio", price: "" }] },
				{ name: "Vacía", products: [] },
			],
		});
		expect(result?.draft.categories).toEqual([
			{
				name: "Pizzas",
				products: [
					{ name: "Margarita", description: "tomate y queso", price: 8990 },
					{ name: "Napolitana", description: "", price: 9490 },
				],
			},
			{ name: "Otros", products: [{ name: "Sin categoría", description: "", price: 3 }] },
		]);
		expect(result?.dropped).toBe(2);
	});

	it("respeta el máximo de productos de una carga", () => {
		const products = Array.from({ length: MENU_DRAFT_MAX_PRODUCTS + 5 }, (_, i) => ({ name: `P${i}`, price: 1 }));
		const result = normalizeMenuDraft({ categories: [{ name: "Todo", products }] });
		expect(result?.draft.categories[0].products).toHaveLength(MENU_DRAFT_MAX_PRODUCTS);
		expect(result?.truncated).toBe(5);
	});

	it("devuelve null si no tiene la forma de un borrador", () => {
		expect(normalizeMenuDraft({ foo: 1 })).toBeNull();
		expect(normalizeMenuDraft(null)).toBeNull();
	});
});

describe("menús de ejemplo", () => {
	it.each(SAMPLE_MENU_SECTORS)("el ejemplo de «%s» es un borrador válido y se reconoce como ejemplo", (sector) => {
		const draft = buildSampleMenu(sector, "CLP");
		const normalized = normalizeMenuDraft(draft);
		expect(normalized?.dropped).toBe(0);
		expect(normalized?.draft).toEqual(draft);
		for (const product of draft.categories.flatMap((c) => c.products)) {
			expect(isSampleProduct(product.name, product.description)).toBe(true);
			expect(product.price % 100).toBe(90);
		}
	});

	it("un producto de ejemplo que el dueño editó deja de contar como ejemplo", () => {
		const [product] = buildSampleMenu("Pizzería", "USD").categories[0].products;
		expect(isSampleProduct(product.name, product.description)).toBe(true);
		expect(isSampleProduct(product.name, "Tomate, mozzarella y albahaca")).toBe(false);
		expect(isSampleProduct("Pizza de la casa", product.description)).toBe(false);
	});

	it("pasa los precios a la moneda del negocio", () => {
		expect(sampleLocalPrice(9, "USD")).toBe(9);
		expect(sampleLocalPrice(9.25, "USD")).toBe(9.5);
		expect(sampleLocalPrice(9, "CLP")).toBe(8590);
		expect(sampleLocalPrice(9, "XYZ")).toBe(9);
	});

	it("usa el tipo de negocio del alta y cae en «Otro» si no lo conoce", () => {
		expect(resolveSampleSector("pizzería")).toBe("Pizzería");
		expect(resolveSampleSector("Heladería")).toBe("Otro");
		expect(resolveSampleSector(null)).toBe("Otro");
	});
});
