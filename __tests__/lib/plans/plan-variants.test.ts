import { describe, expect, it } from "vitest";

import { groupPlanVariants, resolvePublicPlanProductMode } from "@/lib/plans/plan-variants";

const plan = (name: string, productMode: "full" | "menu_only" | "panel_only" = "full") => ({ name, productMode });

describe("resolvePublicPlanProductMode", () => {
	it("lee product_mode de features y cae en «full» si falta o es otra cosa", () => {
		expect(resolvePublicPlanProductMode({ product_mode: "menu_only" })).toBe("menu_only");
		expect(resolvePublicPlanProductMode({ product_mode: "panel_only" })).toBe("panel_only");
		expect(resolvePublicPlanProductMode({})).toBe("full");
		expect(resolvePublicPlanProductMode({ product_mode: "otro" })).toBe("full");
		expect(resolvePublicPlanProductMode(null)).toBe("full");
		expect(resolvePublicPlanProductMode(["menu_only"])).toBe("full");
	});
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
