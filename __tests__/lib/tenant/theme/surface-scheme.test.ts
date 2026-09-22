import { describe, expect, it } from "vitest";

import { resolveSurfaceScheme } from "@/lib/tenant/theme/surface-scheme";

describe("resolveSurfaceScheme", () => {
	it("un fondo negro o muy oscuro va en oscuro", () => {
		expect(resolveSurfaceScheme("#0a0a0a")).toBe("dark");
		expect(resolveSurfaceScheme("#1c1b1f")).toBe("dark");
		expect(resolveSurfaceScheme("rgb(20, 19, 21)")).toBe("dark");
	});

	it("un fondo blanco o crema va en claro", () => {
		expect(resolveSurfaceScheme("#ffffff")).toBe("light");
		expect(resolveSurfaceScheme("#fff8ee")).toBe("light");
		expect(resolveSurfaceScheme("rgba(245, 240, 232, 1)")).toBe("light");
	});

	it("un gris medio sigue siendo oscuro; un gris claro es claro", () => {
		expect(resolveSurfaceScheme("#808080")).toBe("dark");
		expect(resolveSurfaceScheme("#bdbdbd")).toBe("light");
	});

	it("sin fondo, transparente o basura cae al oscuro del sitio", () => {
		expect(resolveSurfaceScheme(undefined)).toBe("dark");
		expect(resolveSurfaceScheme("")).toBe("dark");
		expect(resolveSurfaceScheme("transparent")).toBe("dark");
		expect(resolveSurfaceScheme("rgba(255, 255, 255, 0)")).toBe("dark");
		expect(resolveSurfaceScheme("lol")).toBe("dark");
	});
});
