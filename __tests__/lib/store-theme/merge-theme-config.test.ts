import { describe, expect, it } from "vitest";

import {
	asThemeConfigObject,
	mergeThemeConfig,
	storeThemePatchFromRawDraft,
} from "@/lib/store-theme/merge-theme-config";

describe("asThemeConfigObject", () => {
	it("returns empty object for non-objects", () => {
		expect(asThemeConfigObject(null)).toEqual({});
		expect(asThemeConfigObject(undefined)).toEqual({});
		expect(asThemeConfigObject("x")).toEqual({});
		expect(asThemeConfigObject([])).toEqual({});
	});

	it("clones plain objects", () => {
		const raw = { logoUrl: "a.png", navbarType: "mega-menu" };
		const out = asThemeConfigObject(raw);
		expect(out).toEqual(raw);
		expect(out).not.toBe(raw);
	});
});

describe("mergeThemeConfig", () => {
	it("preserves layout keys when patching logo", () => {
		const existing = {
			logoUrl: "https://old.example/logo.png",
			navbarType: "mega-menu",
			productCardStyle: "layout-food",
			navigationMode: "pagination",
			productDetailsMode: "inline",
			backgroundBrightness: 40,
			panelAccess: { menu: true },
		};

		const next = mergeThemeConfig(existing, {
			logoUrl: "https://new.example/logo.png",
			primaryColor: "#111111",
			panelAccess: { menu: true, billing: true },
		});

		expect(next).toEqual({
			logoUrl: "https://new.example/logo.png",
			navbarType: "mega-menu",
			productCardStyle: "layout-food",
			navigationMode: "pagination",
			productDetailsMode: "inline",
			backgroundBrightness: 40,
			panelAccess: { menu: true, billing: true },
			primaryColor: "#111111",
		});
	});

	it("starts from empty base when published theme is missing", () => {
		expect(
			mergeThemeConfig(null, {
				logoUrl: "https://cdn.example/logo.png",
			}),
		).toEqual({
			logoUrl: "https://cdn.example/logo.png",
		});
	});
});

describe("storeThemePatchFromRawDraft", () => {
	it("only includes keys present on the raw draft", () => {
		const normalized = {
			logoUrl: "path/logo.png",
			navbarType: "category-tabs",
			productCardStyle: "glass",
			primaryColor: "#111",
		};
		const patch = storeThemePatchFromRawDraft(
			{ logoUrl: "path/logo.png", primaryColor: "#111" },
			normalized,
		);
		expect(patch).toEqual({
			logoUrl: "path/logo.png",
			primaryColor: "#111",
		});
		expect(patch).not.toHaveProperty("navbarType");
	});
});
