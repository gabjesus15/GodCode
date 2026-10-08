import { describe, expect, it } from "vitest";

import {
	MENU_ONLY_CEO_TABS,
	companyHasPublicMenu,
	resolvePlanOrderChannel,
	resolvePlanProductMode,
	upsertPlanProductMode,
} from "@/lib/plans/plan-product-mode";

describe("resolvePlanProductMode", () => {
	it("defaults to full when the key is missing or invalid", () => {
		expect(resolvePlanProductMode(null)).toBe("full");
		expect(resolvePlanProductMode({})).toBe("full");
		expect(resolvePlanProductMode({ product_mode: "otro" })).toBe("full");
		expect(resolvePlanProductMode({ product_mode: "menu_only" })).toBe("menu_only");
		expect(resolvePlanProductMode({ product_mode: "panel_only" })).toBe("panel_only");
	});
});

describe("upsertPlanProductMode", () => {
	it("stores the mode and removes the key for full", () => {
		const withMode = upsertPlanProductMode({ ceo_tabs: ["products"] }, "menu_only");
		expect(withMode).toEqual({ ceo_tabs: ["products"], product_mode: "menu_only" });
		expect(upsertPlanProductMode(withMode, "full")).toEqual({ ceo_tabs: ["products"] });
	});
});

describe("resolvePlanOrderChannel", () => {
	it("forces WhatsApp for menu only and keeps the demo menu", () => {
		const menuOnly = { product_mode: "menu_only" };
		expect(resolvePlanOrderChannel(menuOnly, "both")).toBe("whatsapp_only");
		expect(resolvePlanOrderChannel(menuOnly, "panel_only")).toBe("whatsapp_only");
		expect(resolvePlanOrderChannel(menuOnly, "demo")).toBe("demo");
		expect(resolvePlanOrderChannel({}, "panel_only")).toBe("panel_only");
	});
});

describe("companyHasPublicMenu", () => {
	it("is false only for panel only, with the plan joined as object or array", () => {
		expect(companyHasPublicMenu({ plans: { features: { product_mode: "panel_only" } } })).toBe(false);
		expect(companyHasPublicMenu({ plans: [{ features: { product_mode: "panel_only" } }] })).toBe(false);
		expect(companyHasPublicMenu({ plans: { features: { product_mode: "menu_only" } } })).toBe(true);
		expect(companyHasPublicMenu({ plans: null })).toBe(true);
	});
});

describe("MENU_ONLY_CEO_TABS", () => {
	it("keeps the catalog and banners, never sales tabs", () => {
		expect(MENU_ONLY_CEO_TABS).toContain("products");
		expect(MENU_ONLY_CEO_TABS).toContain("menu_carousel");
		for (const tab of ["orders", "caja", "analytics", "clients", "users"]) {
			expect(MENU_ONLY_CEO_TABS).not.toContain(tab);
		}
	});
});
