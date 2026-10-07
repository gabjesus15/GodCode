import { describe, expect, it } from "vitest";

import {
	MENU_TEMPLATES,
	applyMenuTemplate,
	orderMenuTemplatesForSector,
	readMenuTemplateId,
	recommendMenuTemplate,
} from "@/lib/store-theme/menu-templates";
import { normalizeStoreThemeConfig, PRODUCT_CARD_STYLES, STORE_THEME_FONTS } from "@/lib/store-theme/theme-config";

/** Los tipos de negocio del paso 2 del alta (OnboardingStep2Form, campo `sector`). */
const SECTORS = ["Pizzería", "Sushi", "Hamburguesas", "Comida rápida", "Restaurante", "Cafetería", "Panadería y pastelería", "Otro"];

describe("menu templates", () => {
	it("recomienda una plantilla propia para cada tipo de negocio del alta", () => {
		const ids = SECTORS.map((sector) => recommendMenuTemplate(sector));
		expect(ids).toEqual(["horno", "nori", "brasa", "combo", "mantel", "aroma", "hojaldre", "clasica"]);
	});

	it("ignora mayúsculas y tildes, y cae en la clásica si no conoce el negocio", () => {
		expect(recommendMenuTemplate("  pizzeria ")).toBe("horno");
		expect(recommendMenuTemplate("CAFETERÍA")).toBe("aroma");
		expect(recommendMenuTemplate("Heladería")).toBe("clasica");
		expect(recommendMenuTemplate(null)).toBe("clasica");
		expect(recommendMenuTemplate("")).toBe("clasica");
	});

	it("ofrece la recomendada primero y todas las demás después, sin repetir", () => {
		const ordered = orderMenuTemplatesForSector("Sushi").map((t) => t.id);
		expect(ordered[0]).toBe("nori");
		expect(new Set(ordered).size).toBe(MENU_TEMPLATES.length);
	});

	it("cada plantilla usa tarjeta y tipografía que existen", () => {
		const fonts = STORE_THEME_FONTS.map((f) => f.id as string);
		for (const template of MENU_TEMPLATES) {
			expect(PRODUCT_CARD_STYLES).toContain(template.theme.productCardStyle);
			expect(fonts).toContain(template.theme.fontFamily);
		}
	});

	it("aplicar una plantilla deja su id y sobrevive a la normalización del tema", () => {
		const patch = applyMenuTemplate("horno");
		const theme = normalizeStoreThemeConfig({ displayName: "Rica Pizza", logoUrl: "logo.png", ...patch });
		expect(theme.productCardStyle).toBe("layout-cartel");
		expect(theme.fontFamily).toBe("anton");
		expect(theme.menuTemplate).toBe("horno");
		expect(theme.logoUrl).toBe("logo.png");
		expect(readMenuTemplateId(theme)).toBe("horno");
	});

	it("respeta el color de marca del local si se lo pasan", () => {
		const patch = applyMenuTemplate("mantel", { accentColor: "#123ABC" });
		expect(patch.primaryColor).toBe("#123abc");
		expect(patch.priceColor).toBe("#123abc");
		expect(applyMenuTemplate("mantel", { accentColor: "rojo" }).primaryColor).toBe("#1f6f4a");
	});

	it("no lee como plantilla un id desconocido", () => {
		expect(readMenuTemplateId({ menuTemplate: "nope" })).toBeNull();
		expect(readMenuTemplateId(null)).toBeNull();
	});
});
