import { describe, expect, it } from "vitest";

import {
	MENU_TEMPLATES,
	applyMenuTemplate,
	findMenuTemplate,
	menuTemplatePatch,
	orderMenuTemplatesForSector,
	readMenuTemplateId,
	recommendMenuTemplate,
	templatesForSector,
} from "@/lib/store-theme/menu-templates";
import { DEFAULT_STORE_THEME } from "@/components/customer-portal/shared/customer-account-store-theme-constants";
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
		const patch = menuTemplatePatch("horno");
		const theme = normalizeStoreThemeConfig({ displayName: "Rica Pizza", logoUrl: "logo.png", ...patch });
		expect(theme.productCardStyle).toBe("layout-cartel");
		expect(theme.fontFamily).toBe("anton");
		expect(theme.templateId).toBe("horno");
		expect(theme.logoUrl).toBe("logo.png");
		expect(readMenuTemplateId(theme)).toBe("horno");
	});

	it("respeta el color de marca del local si se lo pasan", () => {
		const patch = menuTemplatePatch("mantel", { accentColor: "#123ABC" });
		expect(patch.primaryColor).toBe("#123abc");
		expect(patch.priceColor).toBe("#123abc");
		expect(menuTemplatePatch("mantel", { accentColor: "rojo" }).primaryColor).toBe("#1f6f4a");
	});

	it("no lee como plantilla un id desconocido", () => {
		expect(readMenuTemplateId({ templateId: "nope" })).toBeNull();
		expect(readMenuTemplateId(null)).toBeNull();
	});
});

describe("contrato con el alta", () => {
	it("templatesForSector y findMenuTemplate", () => {
		expect(templatesForSector("Sushi")[0].id).toBe("nori");
		expect(findMenuTemplate("brasa")?.name).toBe("Brasa");
		expect(findMenuTemplate("nada")).toBeNull();
	});

	it("applyMenuTemplate(theme, id) conserva logo, nombre e imagen de fondo", () => {
		const theme = {
			...DEFAULT_STORE_THEME,
			logoUrl: "https://x/logo.png",
			displayName: "Mi local",
			backgroundImageUrl: "https://x/bg.jpg",
			primaryColor: "#000000",
		};
		const out = applyMenuTemplate(theme, "horno");
		expect(out.logoUrl).toBe("https://x/logo.png");
		expect(out.displayName).toBe("Mi local");
		expect(out.backgroundImageUrl).toBe("https://x/bg.jpg");
		expect(out.primaryColor).toBe("#d62828");
		expect(out.templateId).toBe("horno");
		expect(applyMenuTemplate(theme, "no-existe")).toBe(theme);
	});
});
