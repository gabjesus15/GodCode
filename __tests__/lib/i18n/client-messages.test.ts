import { describe, expect, it } from "vitest";

import { getClientMessagesForPath } from "@/lib/i18n/client-messages";

describe("getClientMessagesForPath", () => {
	it("landing solo expone common al cliente", () => {
		const messages = getClientMessagesForPath("/", "es");
		expect(messages.common).toBeDefined();
		expect(messages.tenant).toBeUndefined();
		expect(messages.onboarding).toBeUndefined();
	});

	it("onboarding expone common y onboarding", () => {
		const messages = getClientMessagesForPath("/onboarding", "es");
		expect(messages.common).toBeDefined();
		expect(messages.onboarding).toBeDefined();
		expect(messages.tenant).toBeUndefined();
	});

	it("tenant publico incluye traducciones del carrito", () => {
		const messages = getClientMessagesForPath("/mi-restaurante/menu", "es");
		expect(messages.tenant).toBeDefined();
	});

	it("dominio personalizado en / incluye traducciones del carrito", () => {
		const messages = getClientMessagesForPath("/", "es", { tenantSlug: "oishisushi" });
		expect(messages.tenant?.cart?.modal?.header?.title).toBe("Tu Pedido");
	});

	it("/menu en dominio personalizado incluye traducciones del carrito", () => {
		const messages = getClientMessagesForPath("/menu", "es", { tenantSlug: "oishisushi" });
		expect(messages.tenant?.cart?.modal?.actions?.goToPay).toBe("Ir a Pagar");
	});
});
