import { describe, expect, it } from "vitest";

import { PORTAL_TAB_ORDER, visiblePortalTabs } from "@/components/customer-portal/shared/customer-account-constants";

describe("secciones de /cuenta según el plan", () => {
	it("con menú público se muestran todas", () => {
		expect(visiblePortalTabs(true)).toEqual(PORTAL_TAB_ORDER);
	});

	it("con «solo panel CEO» no aparecen Mi menú, Página de inicio ni Tienda", () => {
		const tabs = visiblePortalTabs(false);
		expect(tabs).not.toContain("menu");
		expect(tabs).not.toContain("perfil");
		expect(tabs).not.toContain("tienda");
		expect(tabs).toEqual(expect.arrayContaining(["resumen", "plan", "sucursales", "facturacion", "soporte", "seguridad"]));
	});
});
