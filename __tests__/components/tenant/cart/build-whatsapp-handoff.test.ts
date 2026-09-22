import { describe, expect, it } from "vitest";

import {
	buildWhatsAppHandoffMessage,
	buildWhatsAppUrl,
	resolveWhatsAppCopy,
} from "@/components/tenant/cart/services/build-whatsapp-handoff";

describe("buildWhatsAppHandoffMessage", () => {
	it("attaches each line note to its description and the business name to the title", () => {
		const message = buildWhatsAppHandoffMessage({
			client: { name: "Ana", rut: "1-9", phone: "+56 9 1111" },
			cart: [
				{ id: "p1", name: "Suprema", quantity: 1, description: "Base", line_note: " sin cebolla " },
				{ id: "p2", name: "Coca", quantity: 2, description: null, line_note: null },
			],
			paymentMethodKey: "efectivo",
			paymentMethodLabel: "Efectivo",
			paymentData: undefined,
			businessName: "Rica Pizza",
			meta: {
				fulfillment: "pickup",
				cartSubtotal: 25,
				deliveryFee: 0,
				grandTotal: 25,
				currency: "USD",
			},
			copy: {},
		});
		expect(message).toContain("NUEVO PEDIDO WEB - Rica Pizza");
		expect(message).toContain("(Hacer: Base | Nota: sin cebolla)");
		expect(message).toContain("+ 2 x COCA");
		expect(message).toContain("Nota: Suprema: sin cebolla");
		expect(message).toContain("Pago: Efectivo");
	});
});

describe("resolveWhatsAppCopy", () => {
	it("maps every label through the translator and uses the country id name", () => {
		const copy = resolveWhatsAppCopy((key) => `[${key}]`, "Cédula");
		expect(copy.rut).toBe("Cédula");
		expect(copy.titlePrefix).toBe("[ws.titlePrefix]");
		expect(copy.paymentUnknown).toBe("[paymentMethods.unknown]");
		expect(copy.taxLabel).toBe("[ws.taxLabel]");
	});
});

describe("buildWhatsAppUrl", () => {
	it("keeps only digits and encodes the message", () => {
		expect(buildWhatsAppUrl("+58 (412) 123-4567", "hola & chau")).toBe(
			"https://wa.me/584121234567?text=hola%20%26%20chau",
		);
	});

	it("returns null without a usable number", () => {
		expect(buildWhatsAppUrl("", "x")).toBeNull();
		expect(buildWhatsAppUrl(null, "x")).toBeNull();
		expect(buildWhatsAppUrl("sin numero", "x")).toBeNull();
	});
});
