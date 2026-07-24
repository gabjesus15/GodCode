import { describe, expect, it } from "vitest";

import {
	getAvailableContactChannels,
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
});
