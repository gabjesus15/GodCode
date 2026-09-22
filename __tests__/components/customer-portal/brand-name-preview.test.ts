import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BrandNamePreview, resolveBrandNamePreviewColor } from "@/components/customer-portal/store-theme/brand-name-preview";
import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";

const base: StoreThemeConfig = {
	displayName: "Rica Pizza",
	primaryColor: "#c11801",
	secondaryColor: "#222222",
	priceColor: "#ffffff",
	discountColor: "#ffd166",
	hoverColor: "#ff4757",
	backgroundColor: "rgba(0, 0, 0, 0.4)",
	backgroundBrightness: null,
	backgroundImageUrl: "",
	logoUrl: "",
};

const render = (theme: StoreThemeConfig) => renderToStaticMarkup(createElement(BrandNamePreview, { theme }));

describe("vista previa del nombre del local", () => {
	it("el color sigue a la elección: primario, hover o propio", () => {
		expect(resolveBrandNamePreviewColor(base)).toBe("#c11801");
		expect(resolveBrandNamePreviewColor({ ...base, brandNameColor: "hover" })).toBe("#ff4757");
		expect(resolveBrandNamePreviewColor({ ...base, brandNameColor: "#123ABC" })).toBe("#123abc");
	});

	it("pinta el nombre con la fuente elegida y su peso", () => {
		const html = render({ ...base, fontFamily: "anton", brandNameColor: "hover" });
		expect(html).toContain("font-family:var(--font-anton), &quot;Anton&quot;, sans-serif");
		expect(html).toContain("font-weight:400");
		expect(html).toContain("color:#ff4757");
		expect(html).toContain(">Rica Pizza<");
	});

	it("el modo claro elegido a mano manda sobre un fondo oscuro", () => {
		expect(render(base)).toContain("rgba(12, 12, 14, 0.82)");
		expect(render({ ...base, surfaceScheme: "light" })).toContain("rgba(255, 253, 250, 0.86)");
	});

	it("sin nombre ni logo enseña un marcador y la inicial", () => {
		const html = render({ ...base, displayName: "  " });
		expect(html).toContain(">Tu local<");
		expect(html).toContain(">T<");
	});
});
