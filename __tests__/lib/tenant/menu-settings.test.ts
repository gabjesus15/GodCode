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

	it("demo: no guarda el pedido, no abre WhatsApp ni exige caja abierta", () => {
		expect(parseCompanyMenuSettings({ orderChannel: "demo" })).toEqual({ cartEnabled: true, orderChannel: "demo" });
		expect(shouldPersistOrderToPanel("demo")).toBe(false);
		expect(shouldOpenWhatsAppOnCheckout("demo")).toBe(false);
		expect(requiresOpenShiftForCheckout("demo")).toBe(false);
	});

	it("demo: el portal del dueño no puede activarlo, pero sí mantenerlo o quitarlo", () => {
		const blocked = mergeMenuSettingsIntoIntegration({ menu: { cartEnabled: true, orderChannel: "both" } }, { orderChannel: "demo" });
		expect(blocked.menu).toEqual({ cartEnabled: true, orderChannel: "both" });

		const kept = mergeMenuSettingsIntoIntegration({ menu: { cartEnabled: true, orderChannel: "demo" } }, { cartEnabled: false });
		expect(kept.menu).toEqual({ cartEnabled: false, orderChannel: "demo" });

		const removed = mergeMenuSettingsIntoIntegration({ menu: { orderChannel: "demo" } }, { orderChannel: "panel_only" });
		expect(removed.menu).toEqual({ cartEnabled: true, orderChannel: "panel_only" });
	});
});
