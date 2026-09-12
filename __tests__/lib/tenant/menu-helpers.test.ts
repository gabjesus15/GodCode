import { describe, expect, it } from "vitest";

import {
	formatMenuDescription,
	formatMenuTitle,
	getAvailableContactChannels,
	isPromocionesCategoryName,
	resolveContactFlowStep,
	resolveMenuCartUiMode,
	resolveSelectedMenuBranch,
	shouldShowBottomNav,
	shouldShowContactTab,
} from "@/lib/tenant/menu/menu-helpers";

describe("menu-helpers", () => {
	it("shouldShowBottomNav for food and floating-bottom", () => {
		expect(shouldShowBottomNav("layout-food", "category-tabs")).toBe(true);
		expect(shouldShowBottomNav("glass", "floating-bottom")).toBe(true);
		expect(shouldShowBottomNav("glass", "category-tabs")).toBe(false);
	});

	it("resolveMenuCartUiMode without branch", () => {
		expect(resolveMenuCartUiMode({ hasBranch: false, onlineOrderingEnabled: true, showBottomNav: true })).toBe("none");
	});

	it("resolveMenuCartUiMode float vs bottom nav", () => {
		expect(resolveMenuCartUiMode({ hasBranch: true, onlineOrderingEnabled: true, showBottomNav: false })).toBe("float-with-modal");
		expect(resolveMenuCartUiMode({ hasBranch: true, onlineOrderingEnabled: true, showBottomNav: true })).toBe("bottom-nav");
		expect(resolveMenuCartUiMode({ hasBranch: true, onlineOrderingEnabled: false, showBottomNav: true })).toBe("bottom-nav-only");
	});

	it("resolveSelectedMenuBranch auto-selects unambiguous open branch", () => {
		const branches = [{ id: "a" }, { id: "b" }];
		expect(
			resolveSelectedMenuBranch({
				branches,
				openBranchIds: ["a"],
				requestedBranchId: null,
			})?.id,
		).toBe("a");
		expect(
			resolveSelectedMenuBranch({
				branches,
				openBranchIds: ["a", "b"],
				requestedBranchId: null,
			}),
		).toBeNull();
		expect(
			resolveSelectedMenuBranch({
				branches: [{ id: "solo" }],
				openBranchIds: [],
				requestedBranchId: null,
			})?.id,
		).toBe("solo");
		expect(
			resolveSelectedMenuBranch({
				branches,
				openBranchIds: ["a"],
				requestedBranchId: "b",
			}),
		).toBeNull();
		expect(
			resolveSelectedMenuBranch({
				branches,
				openBranchIds: ["a", "b"],
				requestedBranchId: "b",
			})?.id,
		).toBe("b");
	});

	it("contact channels respect selected branch", () => {
		const branches = [
			{ id: "a", whatsapp_url: "https://wa.me/1", instagram_url: null, map_url: null },
			{ id: "b", whatsapp_url: null, instagram_url: "https://instagram.com/x", map_url: null },
		];
		expect(getAvailableContactChannels(branches, "a")).toEqual(["whatsapp"]);
		expect(getAvailableContactChannels(branches, "b")).toEqual(["instagram"]);
		expect(shouldShowContactTab(branches, "a")).toBe(true);
		expect(shouldShowContactTab([{ id: "c" }], "c")).toBe(false);
	});

	it("resolveContactFlowStep opens direct link for single channel and branch", () => {
		const branches = [{ id: "a", whatsapp_url: "https://wa.me/1" }];
		expect(resolveContactFlowStep(branches, "a")).toEqual({
			type: "direct",
			channel: "whatsapp",
			branch: branches[0],
		});
	});

	it("resolveContactFlowStep asks for channel when multiple exist", () => {
		const branches = [{ id: "a", whatsapp_url: "https://wa.me/1", instagram_url: "https://instagram.com/x" }];
		expect(resolveContactFlowStep(branches, "a")).toEqual({ type: "pick-channel" });
	});

	it("formatMenuTitle normalizes ALL CAPS and all-lower to clean title case", () => {
		expect(formatMenuTitle("HOT ROLLS ESPECIALES OISHI")).toBe("Hot Rolls Especiales Oishi");
		expect(formatMenuTitle("ROLLS DE LA CASA OISHI")).toBe("Rolls de la Casa Oishi");
		expect(formatMenuTitle("ROLLS SIN ARROZ")).toBe("Rolls sin Arroz");
		expect(formatMenuTitle("ENTRADAS CALIENTES")).toBe("Entradas Calientes");
		expect(formatMenuTitle("AL HORNO CON PAPAS")).toBe("Al Horno con Papas");
		expect(formatMenuTitle("DEL CHEF")).toBe("Del Chef");
		expect(formatMenuTitle("PIZZA BBQ XL")).toBe("Pizza BBQ XL");
		expect(formatMenuTitle("PROMO 2X1")).toBe("Promo 2X1");
		expect(formatMenuTitle("COCA-COLA ZERO 350ML")).toBe("Coca-Cola Zero 350ml");
		expect(formatMenuTitle("gohan mixto")).toBe("Gohan Mixto");
	});

	it("formatMenuTitle preserves intentionally mixed casing", () => {
		expect(formatMenuTitle("Rolls de Salmón")).toBe("Rolls de Salmón");
		expect(formatMenuTitle("Coca-Cola Zero")).toBe("Coca-Cola Zero");
		expect(formatMenuTitle("McFlurry con Oreo")).toBe("McFlurry con Oreo");
	});

	it("formatMenuDescription normalizes ALL CAPS descriptions to sentence case", () => {
		expect(
			formatMenuDescription(
				"DELICIOSO ROLL RELLENO DE SALMON Y PALTA, CUBIERTO EN SESAMO TOSTADO. INCLUYE SOYA Y BBQ.",
			),
		).toBe("Delicioso roll relleno de salmon y palta, cubierto en sesamo tostado. Incluye soya y BBQ.");
		expect(formatMenuDescription("Ya en minúsculas y Mayúsculas.")).toBe("Ya en minúsculas y Mayúsculas.");
	});

	it("isPromocionesCategoryName recognizes promo variations and rejects others", () => {
		expect(isPromocionesCategoryName("Promociones")).toBe(true);
		expect(isPromocionesCategoryName("promociones")).toBe(true);
		expect(isPromocionesCategoryName("PROMOCIONES")).toBe(true);
		expect(isPromocionesCategoryName("Promoción")).toBe(true);
		expect(isPromocionesCategoryName("promocion")).toBe(true);
		expect(isPromocionesCategoryName("Promos")).toBe(true);
		expect(isPromocionesCategoryName("promo")).toBe(true);
		expect(isPromocionesCategoryName("  Promociones  ")).toBe(true);

		expect(isPromocionesCategoryName("Pizzas")).toBe(false);
		expect(isPromocionesCategoryName("Bebidas")).toBe(false);
		expect(isPromocionesCategoryName(null)).toBe(false);
		expect(isPromocionesCategoryName(undefined)).toBe(false);
	});
});
