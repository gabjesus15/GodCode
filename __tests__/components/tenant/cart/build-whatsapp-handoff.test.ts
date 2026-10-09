import { describe, expect, it } from "vitest";

import {
	buildWebOrderReference,
	buildWhatsAppHandoffMessage,
	buildWhatsAppUrl,
	resolveWhatsAppCopy,
} from "@/components/tenant/cart/services/build-whatsapp-handoff";

describe("buildWhatsAppHandoffMessage", () => {
	it("lists each dish with its price, extras, changes and note, without the catalog description", () => {
		const message = buildWhatsAppHandoffMessage({
			client: { name: "Ana", rut: "1-9", phone: "+56 9 1111" },
			cart: [
				{
					id: "p1",
					name: "Suprema (Grande)",
					quantity: 2,
					price: 10,
					description: "Masa madre con tomate",
					selected_extras: [{ id: "e1", name: "Queso", price: 1.5, qty: 1 }],
					line_summary: "Sin cebolla",
					line_note: " bien cocida ",
				},
				{ id: "p2", name: "Coca", quantity: 1, price: 2, has_discount: true, discount_price: 1.5, description: null },
			],
			globalExtras: [{ id: "g1", name: "Servilletas", price: 0, qty: 1 }],
			paymentMethodKey: "efectivo",
			paymentMethodLabel: "Efectivo",
			paymentData: undefined,
			businessName: "Rica Pizza",
			meta: {
				fulfillment: "delivery",
				cartSubtotal: 24.5,
				deliveryFee: 3,
				grandTotal: 27.5,
				currency: "USD",
				deliverySummary: "Dirección: Av. Siempre Viva 742, Centro",
				deliveryReference: "Casa azul",
				deliveryMapsUrl: "https://www.google.com/maps/dir/?api=1&destination=1%2C2",
				webReference: "AB12CD",
			},
			copy: {},
		});
		expect(message).toContain("*Nuevo pedido · Rica Pizza*");
		expect(message).toContain("Ref. AB12CD");
		expect(message).toContain("*2x Suprema (Grande)* — $23.00");
		expect(message).toContain("↳ Extras: 1x Queso");
		expect(message).toContain("↳ Cambios: Sin cebolla");
		expect(message).toContain("↳ Nota: bien cocida");
		expect(message).toContain("*1x Coca* — $1.50");
		expect(message).toContain("*1x Servilletas* — $0.00");
		expect(message).not.toContain("Masa madre");
		expect(message).toContain("*Delivery*");
		expect(message).toContain("Referencia: Casa azul");
		expect(message).toContain("Ubicación: https://www.google.com/maps/dir/");
		expect(message).toContain("Envío: $3.00");
		expect(message).toContain("*TOTAL: $27.50*");
		expect(message).toContain("Pago: Efectivo");
	});

	it("prefers the order number and delivery code over the web reference", () => {
		const message = buildWhatsAppHandoffMessage({
			client: { name: "Ana", rut: "", phone: "+56 9 1111" },
			cart: [{ id: "p1", name: "Arepa", quantity: 1, price: 5 }],
			paymentMethodKey: null,
			paymentMethodLabel: "Por definir",
			paymentData: undefined,
			businessName: "Mi Local",
			meta: {
				fulfillment: "pickup",
				cartSubtotal: 5,
				deliveryFee: 0,
				grandTotal: 5,
				currency: "USD",
				orderNumber: 42,
				handoffCode: "7731",
				webReference: "ZZZZZZ",
			},
			copy: {},
		});
		expect(message).toContain("Pedido #42 · Código de entrega: *7731*");
		expect(message).not.toContain("ZZZZZZ");
		expect(message).toContain("*Retiro en el local*");
		expect(message).not.toContain("RUT");
	});
});

describe("buildWebOrderReference", () => {
	it("takes six characters of the request id", () => {
		expect(buildWebOrderReference("4f7ka2b1-1111-2222-3333-444444444444")).toBe("4F7KA2");
		expect(buildWebOrderReference("")).toBeNull();
		expect(buildWebOrderReference(null)).toBeNull();
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
