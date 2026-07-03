import { describe, expect, it } from "vitest";

import { resolveEffectiveNavigationMode } from "@/lib/tenant/menu/resolve-effective-navigation-mode";

describe("resolveEffectiveNavigationMode", () => {
	it("respeta pagination configurado", () => {
		expect(resolveEffectiveNavigationMode("pagination", 100, false)).toBe("pagination");
	});

	it("usa pagination en gama baja con catálogo largo", () => {
		expect(resolveEffectiveNavigationMode("scroll", 40, true)).toBe("pagination");
	});

	it("mantiene scroll en gama baja con pocos productos", () => {
		expect(resolveEffectiveNavigationMode("scroll", 12, true)).toBe("scroll");
	});

	it("mantiene scroll en flagship con catálogo largo", () => {
		expect(resolveEffectiveNavigationMode("scroll", 80, false)).toBe("scroll");
	});
});
