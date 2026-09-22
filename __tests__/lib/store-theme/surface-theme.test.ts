import { describe, expect, it } from "vitest";

import {
	buildTenantSurfaceCssString,
	resolveTenantSurfaceSchemeAttr,
	tenantSurfaceCssVarEntries,
} from "@/lib/store-theme/surface-theme";
import {
	normalizeBrandNameColor,
	normalizeFontFamily,
	normalizeStoreThemeConfig,
	normalizeSurfaceScheme,
} from "@/lib/store-theme/theme-config";
import { extractCssVarNames } from "@/lib/store-theme/theme-css-var-contract";
import { resolveSurfaceScheme } from "@/lib/tenant/theme/surface-scheme";

describe("ajustes de superficie del menú", () => {
	it("normaliza modo, tipografía y color del nombre con respaldos seguros", () => {
		expect(normalizeSurfaceScheme("LIGHT")).toBe("light");
		expect(normalizeSurfaceScheme("neón")).toBe("auto");
		expect(normalizeFontFamily("playfair")).toBe("playfair");
		expect(normalizeFontFamily("comic sans")).toBe("montserrat");
		expect(normalizeBrandNameColor("#ABC")).toBe("#aabbcc");
		expect(normalizeBrandNameColor("hover")).toBe("hover");
		expect(normalizeBrandNameColor("rojo")).toBe("");
	});

	it("un tema viejo sin estos campos sigue siendo válido", () => {
		const theme = normalizeStoreThemeConfig({ primaryColor: "#c11801" });
		expect(theme.surfaceScheme).toBe("auto");
		expect(theme.fontFamily).toBe("montserrat");
		expect(theme.brandNameColor).toBe("");
	});

	it("emite su propio bloque CSS sin tocar el contrato compartido", () => {
		const css = buildTenantSurfaceCssString({ surfaceScheme: "light", fontFamily: "lora", brandNameColor: "#112233" });
		expect(extractCssVarNames(css)).toEqual(["--tenant-surface-scheme", "--tenant-font", "--menu-brand-color"]);
		expect(css).toContain("--tenant-font:var(--font-lora), \"Lora\", serif;");
		expect(css).toContain("--menu-brand-color:#112233;");
	});

	it("con \"hover\" el nombre apunta a la variable del color hover", () => {
		expect(buildTenantSurfaceCssString({ brandNameColor: "hover" })).toContain("--menu-brand-color:var(--accent-hover, var(--accent-primary));");
	});

	it("sin color elegido no declara la variable: el CSS cae al color de marca", () => {
		const names = tenantSurfaceCssVarEntries({}).map(([name]) => name);
		expect(names).not.toContain("--menu-brand-color");
	});

	it("la elección explícita manda sobre la luminancia del fondo", () => {
		expect(resolveSurfaceScheme("#ffffff", "dark")).toBe("dark");
		expect(resolveSurfaceScheme("#0a0a0a", "light")).toBe("light");
		expect(resolveSurfaceScheme("#0a0a0a", "auto")).toBe("dark");
		expect(resolveSurfaceScheme("#ffffff", undefined)).toBe("light");
	});

	it("el SSR solo fija data-scheme cuando el local eligió a mano", () => {
		expect(resolveTenantSurfaceSchemeAttr({ surfaceScheme: "auto" })).toBeUndefined();
		expect(resolveTenantSurfaceSchemeAttr({ surfaceScheme: "dark" })).toBe("dark");
	});
});
