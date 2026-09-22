import { describe, expect, it } from "vitest";

import { normalizeCompanyPanelAccess } from "@/lib/super-admin/company-panel-access";
import { TENANT_ADMIN_TAB_IDS } from "@/lib/super-admin/tenant-admin-tabs";
import {
	extractCeoTabsFromPlanFeatures,
	upsertPlanFeaturesCeoTabs,
} from "@/lib/plans/tenant-plan-features";

/**
 * Cada pestaña del panel del local (GodCode Caja) tiene que poder concederse desde
 * aquí. Lo que no esté en TENANT_ADMIN_TAB_OPTIONS lo descarta `sanitizeTabId`
 * antes de guardarse en `features.ceo_tabs`, así que al local nunca le llega y la
 * sección le aparece como "no habilitada".
 *
 * Los ids son los que acepta `normalizeStoredNavTabId` del panel del local
 * (src/shared/constants/admin-panel-tabs.ts): unos son canónicos y otros viajan
 * como alias heredado.
 */
const TABS_DEL_PANEL_DEL_LOCAL = [
	"orders",
	"caja",
	"analytics",
	"local_expenses",
	"categories",
	"products",
	"inventory",
	"beverages", // alias de menu_beverages
	"extras", // alias de menu_extras
	"menu_carousel",
	"admin_menu_options", // alias de menu_options
	"clients",
	"coupons",
];

describe("catálogo de pestañas del panel del local", () => {
	it("ofrece todas las secciones que el panel del local sabe mostrar", () => {
		const conocidas: readonly string[] = TENANT_ADMIN_TAB_IDS;
		const faltantes = TABS_DEL_PANEL_DEL_LOCAL.filter((id) => !conocidas.includes(id));
		expect(faltantes).toEqual([]);
	});

	it("deja pasar las secciones nuevas hasta features.ceo_tabs", () => {
		const features = upsertPlanFeaturesCeoTabs({}, ["caja", "local_expenses", "menu_carousel"]);
		expect(features.ceo_tabs).toEqual(["caja", "local_expenses", "menu_carousel"]);
		expect(extractCeoTabsFromPlanFeatures(features)).toEqual([
			"caja",
			"local_expenses",
			"menu_carousel",
		]);
	});

	it("conserva las secciones nuevas al leer el panelAccess de una empresa", () => {
		expect(normalizeCompanyPanelAccess(["local_expenses", "menu_carousel"])).toEqual([
			"local_expenses",
			"menu_carousel",
		]);
		expect(normalizeCompanyPanelAccess({ panelAccess: ["menu_carousel"] })).toEqual([
			"menu_carousel",
		]);
	});

	it("descarta ids que el panel del local no conoce", () => {
		expect(normalizeCompanyPanelAccess(["caja", "seccion_inventada"])).toEqual(["caja"]);
	});
});
