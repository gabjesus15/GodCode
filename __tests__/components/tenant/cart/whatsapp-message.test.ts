import { describe, expect, it } from "vitest";

import { generateWSMessage } from "@/components/tenant/cart/services/whatsapp-message";

describe("generateWSMessage Venezuela", () => {
	it("uses cedula label and bolivar-first total for pago movil", () => {
		const msg = generateWSMessage(
			{ name: "Juan Pérez", rut: "V-12345678", phone: "+58 412 123 4567" },
			[{ name: "Arepa", quantity: 2 }],
			2500,
			"pago_movil",
			"",
			"Mi Local",
			undefined,
			{
				fulfillment: "pickup",
				cartSubtotal: 2500,
				deliveryFee: 0,
				grandTotal: 2500,
				currency: "USD",
				country: "VE",
				exchangeRate: 639.703,
				paymentMethodKey: "pago_movil",
			},
			{
				rut: "Cédula / RIF",
			},
			"Pago Móvil",
		);

		expect(msg).toContain("Cédula / RIF: V-12345678");
		expect(msg).not.toContain("RUT:");
		expect(msg).toMatch(/\*TOTAL: Bs\./);
		expect(msg).toContain("$2,500.00");
	});

	it("shows USD total for zelle", () => {
		const msg = generateWSMessage(
			{ name: "Juan", rut: "V-12345678", phone: "+58 412 123 4567" },
			[{ name: "Arepa", quantity: 1 }],
			2500,
			"zelle",
			"",
			"Mi Local",
			undefined,
			{
				fulfillment: "pickup",
				cartSubtotal: 2500,
				deliveryFee: 0,
				grandTotal: 2500,
				currency: "USD",
				country: "VE",
				exchangeRate: 639.703,
				paymentMethodKey: "zelle",
			},
			{ rut: "Cédula / RIF" },
			"Zelle",
		);

		expect(msg).toContain("*TOTAL: $2,500.00*");
		expect(msg).not.toContain("Bs.");
	});
});
