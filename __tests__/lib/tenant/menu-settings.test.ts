import { describe, expect, it } from "vitest";

import {
	DEFAULT_MENU_SETTINGS,
	extractMenuSettingsFromIntegration,
	mergeMenuSettingsIntoIntegration,
	parseCompanyMenuSettings,
	requiresOpenShiftForCheckout,
	resolveOnlineOrderingEnabled,
	shouldOpenWhatsAppOnCheckout,
	shouldPersistOrderToPanel,
} from "@/lib/tenant/menu-settings";

describe("menu-settings", () => {
	it("parses defaults when menu block is missing", () => {
		expect(parseCompanyMenuSettings(undefined)).toEqual(DEFAULT_MENU_SETTINGS);
		expect(extractMenuSettingsFromIntegration({ uber: { clientId: "x" } })).toEqual(
			DEFAULT_MENU_SETTINGS,
		);
	});

	it("parses stored menu settings", () => {
		expect(
			parseCompanyMenuSettings({ cartEnabled: false, orderChannel: "panel_only" }),
		).toEqual({ cartEnabled: false, orderChannel: "panel_only" });
	});

	it("merges menu settings without dropping other integration keys", () => {
		const merged = mergeMenuSettingsIntoIntegration(
			{ uber: { clientId: "uber-1" }, menu: { cartEnabled: true, orderChannel: "both" } },
			{ orderChannel: "whatsapp_only" },
		);
		expect(merged).toEqual({
			uber: { clientId: "uber-1" },
			menu: { cartEnabled: true, orderChannel: "whatsapp_only" },
		});
	});

	it("resolves online ordering from plan and cart toggle", () => {
		expect(
			resolveOnlineOrderingEnabled({ online_ordering: true }, { cartEnabled: true, orderChannel: "both" }),
		).toBe(true);
		expect(
			resolveOnlineOrderingEnabled({ online_ordering: false }, { cartEnabled: true, orderChannel: "both" }),
		).toBe(false);
		expect(
			resolveOnlineOrderingEnabled({ online_ordering: true }, { cartEnabled: false, orderChannel: "both" }),
		).toBe(false);
	});

	it("maps order channel behavior", () => {
		expect(shouldPersistOrderToPanel("both")).toBe(true);
		expect(shouldPersistOrderToPanel("panel_only")).toBe(true);
		expect(shouldPersistOrderToPanel("whatsapp_only")).toBe(false);

		expect(shouldOpenWhatsAppOnCheckout("both")).toBe(true);
		expect(shouldOpenWhatsAppOnCheckout("whatsapp_only")).toBe(true);
		expect(shouldOpenWhatsAppOnCheckout("panel_only")).toBe(false);

		expect(requiresOpenShiftForCheckout("whatsapp_only")).toBe(false);
		expect(requiresOpenShiftForCheckout("panel_only")).toBe(true);
	});
});
