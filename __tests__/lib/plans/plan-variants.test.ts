import { describe, expect, it } from "vitest";

import {
	groupPlanVariants,
	isPlanRecommended,
	popularPlanIndex,
	recommendedGroupIndex,
	upsertPlanRecommended,
} from "@/lib/plans/plan-variants";

const plan = (name: string, productMode: "full" | "menu_only" | "panel_only" = "full", recommended = false) => ({
	name,
	productMode,
	recommended,
});

describe("groupPlanVariants", () => {
	it("sin variantes, cada plan es su propia tarjeta con su nombre completo", () => {
		const groups = groupPlanVariants([plan("Básico"), plan("Avanzado"), plan("Business")]);
		expect(groups.map((g) => g.name)).toEqual(["Básico", "Avanzado", "Business"]);
		expect(groups.every((g) => g.variants.length === 1)).toBe(true);
	});

	it("junta las dos variantes del Básico en una tarjeta con selector Menú / Panel", () => {
		const groups = groupPlanVariants([
			plan("Básico · Menú digital", "menu_only"),
			plan("Básico · Panel CEO", "panel_only"),
			plan("Avanzado"),
		]);
		expect(groups).toHaveLength(2);
		expect(groups[0]?.name).toBe("Básico");
		expect(groups[0]?.variants.map((v) => v.label)).toEqual(["Menú", "Panel"]);
		expect(groups[0]?.variants.map((v) => v.plan.name)).toEqual(["Básico · Menú digital", "Básico · Panel CEO"]);
		expect(groups[1]?.name).toBe("Avanzado");
	});

	it("el grupo ocupa el lugar de su primera variante, así el orden por precio no cambia", () => {
		const groups = groupPlanVariants([
			plan("Básico · Menú digital", "menu_only"),
			plan("Avanzado"),
			plan("Básico · Panel CEO", "panel_only"),
		]);
		expect(groups.map((g) => g.name)).toEqual(["Básico", "Avanzado"]);
		expect(groups[0]?.variants).toHaveLength(2);
	});

	it("las variantes sin modo usan lo que va después del separador como etiqueta", () => {
		const groups = groupPlanVariants([plan("Pro · Mensual"), plan("Pro · Anual")]);
		expect(groups[0]?.name).toBe("Pro");
		expect(groups[0]?.variants.map((v) => v.label)).toEqual(["Mensual", "Anual"]);
	});

	it("un plan con separador pero sin pareja conserva su nombre completo", () => {
		const groups = groupPlanVariants([plan("Básico · Menú digital", "menu_only"), plan("Avanzado")]);
		expect(groups[0]?.name).toBe("Básico · Menú digital");
		expect(groups[0]?.variants).toHaveLength(1);
	});

	it("un «Básico» a secas no se mete en el grupo de sus variantes, aunque siga público", () => {
		const groups = groupPlanVariants([
			plan("Básico"),
			plan("Básico · Menú digital", "menu_only"),
			plan("Básico · Panel CEO", "panel_only"),
		]);
		expect(groups.map((g) => g.name)).toEqual(["Básico", "Básico"]);
		expect(groups[0]?.variants).toHaveLength(1);
		expect(groups[1]?.variants.map((v) => v.label)).toEqual(["Menú", "Panel"]);
		expect(groups[0]?.key).not.toBe(groups[1]?.key);
	});

	it("los nombres traducidos se agrupan igual mientras compartan el separador", () => {
		const groups = groupPlanVariants([plan("Basic · Digital menu", "menu_only"), plan("Basic · CEO panel", "panel_only")]);
		expect(groups).toHaveLength(1);
		expect(groups[0]?.name).toBe("Basic");
	});
});

describe("isPlanRecommended / upsertPlanRecommended", () => {
	it("solo cuenta el `true` literal en features.recommended", () => {
		expect(isPlanRecommended({ recommended: true })).toBe(true);
		expect(isPlanRecommended({ recommended: "true" })).toBe(false);
		expect(isPlanRecommended({ recommended: 1 })).toBe(false);
		expect(isPlanRecommended({})).toBe(false);
		expect(isPlanRecommended(null)).toBe(false);
		expect(isPlanRecommended([true])).toBe(false);
	});

	it("escribe la marca sin tocar el resto y la borra al desmarcar", () => {
		const marked = upsertPlanRecommended({ product_mode: "menu_only", ceo_tabs: ["products"] }, true);
		expect(marked).toEqual({ product_mode: "menu_only", ceo_tabs: ["products"], recommended: true });
		expect(upsertPlanRecommended(marked, false)).toEqual({ product_mode: "menu_only", ceo_tabs: ["products"] });
		expect(upsertPlanRecommended(null, false)).toEqual({});
	});
});

describe("recommendedGroupIndex", () => {
	it("sin ningún plan marcado, la insignia cae en la tarjeta del medio", () => {
		expect(popularPlanIndex(0)).toBe(0);
		expect(popularPlanIndex(1)).toBe(0);
		expect(popularPlanIndex(2)).toBe(1);
		expect(popularPlanIndex(3)).toBe(1);
		expect(popularPlanIndex(4)).toBe(2);

		const groups = groupPlanVariants([plan("Básico"), plan("Avanzado"), plan("Business")]);
		expect(recommendedGroupIndex(groups)).toBe(1);
		expect(recommendedGroupIndex([])).toBe(0);
	});

	it("con un plan marcado, la insignia va a su tarjeta aunque no sea la del medio", () => {
		const groups = groupPlanVariants([plan("Básico"), plan("Avanzado"), plan("Business", "full", true)]);
		expect(recommendedGroupIndex(groups)).toBe(2);
	});

	it("una variante marcada recomienda la tarjeta de su grupo", () => {
		const groups = groupPlanVariants([
			plan("Básico · Menú digital", "menu_only"),
			plan("Básico · Panel CEO", "panel_only", true),
			plan("Avanzado"),
			plan("Business"),
		]);
		expect(groups).toHaveLength(3);
		expect(recommendedGroupIndex(groups)).toBe(0);
	});

	it("con varios marcados gana el primero de la lista (que ya viene ordenada por precio)", () => {
		const groups = groupPlanVariants([plan("Básico"), plan("Avanzado", "full", true), plan("Business", "full", true)]);
		expect(recommendedGroupIndex(groups)).toBe(1);
	});
});
