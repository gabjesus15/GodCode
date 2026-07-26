import { describe, expect, it } from "vitest";

import { resolveEffectiveNavigationMode } from "@/lib/tenant/menu/resolve-effective-navigation-mode";

describe("resolveEffectiveNavigationMode", () => {
	it("respeta pagination configurado", () => {
		expect(resolveEffectiveNavigationMode("pagination")).toBe("pagination");
	});

	it("usa scroll por defecto", () => {
		expect(resolveEffectiveNavigationMode("scroll")).toBe("scroll");
	});

	it("trata valores desconocidos como scroll", () => {
		expect(resolveEffectiveNavigationMode("")).toBe("scroll");
		expect(resolveEffectiveNavigationMode("other")).toBe("scroll");
	});
});
