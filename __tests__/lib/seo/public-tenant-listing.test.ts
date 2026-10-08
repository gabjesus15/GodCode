import { describe, expect, it } from "vitest";
import { companyPlanHasPublicMenu, isPubliclyListedCompany } from "@/lib/seo/public-tenant-listing";

describe("companyPlanHasPublicMenu", () => {
	it("un plan sin product_mode es completo y tiene menú", () => {
		expect(companyPlanHasPublicMenu(null)).toBe(true);
		expect(companyPlanHasPublicMenu({ features: {} })).toBe(true);
		expect(companyPlanHasPublicMenu({ features: null })).toBe(true);
		expect(companyPlanHasPublicMenu({ features: { product_mode: "full" } })).toBe(true);
		expect(companyPlanHasPublicMenu({ features: { product_mode: "menu_only" } })).toBe(true);
	});

	it("«solo panel CEO» no tiene menú público", () => {
		expect(companyPlanHasPublicMenu({ features: { product_mode: "panel_only" } })).toBe(false);
		expect(companyPlanHasPublicMenu([{ features: { product_mode: "panel_only" } }])).toBe(false);
	});
});

describe("isPubliclyListedCompany", () => {
	it("lista negocios con slug, plan con menú y que no son de prueba", () => {
		expect(isPubliclyListedCompany({ public_slug: "rica-pizza", plans: null })).toBe(true);
		expect(
			isPubliclyListedCompany({ public_slug: "rica-pizza", plans: { features: { product_mode: "menu_only" } } }),
		).toBe(true);
	});

	it("excluye tiendas de prueba, sin slug o con «solo panel»", () => {
		expect(isPubliclyListedCompany({ public_slug: "demo-pizza", plans: null })).toBe(false);
		expect(isPubliclyListedCompany({ public_slug: "", plans: null })).toBe(false);
		expect(isPubliclyListedCompany({ public_slug: null, plans: null })).toBe(false);
		expect(
			isPubliclyListedCompany({ public_slug: "rica-pizza", plans: { features: { product_mode: "panel_only" } } }),
		).toBe(false);
	});
});
