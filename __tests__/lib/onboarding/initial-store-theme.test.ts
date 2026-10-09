import { describe, expect, it } from "vitest";

import { DEFAULT_STORE_THEME } from "@/components/customer-portal/shared/customer-account-store-theme-constants";
import { initialStoreTheme } from "@/lib/onboarding/checkout-service";
import { BUSINESS_SECTORS } from "@/lib/onboarding/business-sectors";
import { applyMenuTemplate, MENU_TEMPLATES, templatesForSector } from "@/lib/store-theme/menu-templates";

describe("plantillas por tipo de negocio", () => {
	it("cada tipo de negocio tiene al menos una plantilla recomendada, primero", () => {
		for (const sector of BUSINESS_SECTORS) {
			const list = templatesForSector(sector);
			expect(list.length).toBe(MENU_TEMPLATES.length);
			expect(list[0].sectors).toContain(sector);
		}
	});

	it("aplicar una plantilla no toca el logo, el nombre ni la imagen de fondo", () => {
		const theme = { ...DEFAULT_STORE_THEME, displayName: "Pizzas Don Lucho", logoUrl: "logos/x.png", backgroundImageUrl: "bg/y.jpg" };
		for (const template of MENU_TEMPLATES) {
			const applied = applyMenuTemplate(theme, template.id);
			expect(applied).toMatchObject({ displayName: "Pizzas Don Lucho", logoUrl: "logos/x.png", backgroundImageUrl: "bg/y.jpg", templateId: template.id });
		}
		expect(applyMenuTemplate(theme, "no-existe")).toBe(theme);
	});
});

describe("initialStoreTheme", () => {
	it("la tienda nace con el diseño recomendado para su negocio, su nombre y su logo", () => {
		const theme = initialStoreTheme({ business_name: "Sushi Ya", logo_url: "logos/sushi.png", sector: "sushi" });
		const expected = templatesForSector("Sushi")[0];
		expect(theme).toMatchObject({ ...expected.theme, templateId: expected.id, displayName: "Sushi Ya", logoUrl: "logos/sushi.png" });
	});

	it("sin tipo de negocio usa la de «Otro»", () => {
		expect(initialStoreTheme({ business_name: "X", sector: null }).templateId).toBe(templatesForSector("Otro")[0].id);
	});
});
