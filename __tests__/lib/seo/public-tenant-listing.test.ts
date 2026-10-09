import { describe, expect, it } from "vitest";
import { isPubliclyListedCompany } from "@/lib/seo/public-tenant-listing";

describe("isPubliclyListedCompany", () => {
	it("lista negocios con slug, plan con menú y que no son de prueba", () => {
		expect(isPubliclyListedCompany({ public_slug: "rica-pizza", plans: null })).toBe(true);
		expect(isPubliclyListedCompany({ public_slug: "rica-pizza", plans: { features: {} } })).toBe(true);
		expect(isPubliclyListedCompany({ public_slug: "rica-pizza", plans: { features: null } })).toBe(true);
		expect(
			isPubliclyListedCompany({ public_slug: "rica-pizza", plans: { features: { product_mode: "full" } } }),
		).toBe(true);
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
		// El join de Supabase puede llegar como arreglo.
		expect(
			isPubliclyListedCompany({ public_slug: "rica-pizza", plans: [{ features: { product_mode: "panel_only" } }] }),
		).toBe(false);
	});
});
