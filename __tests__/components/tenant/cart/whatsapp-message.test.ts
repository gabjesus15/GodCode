import { describe, expect, it } from "vitest";

import { generateWSMessage } from "@/components/tenant/cart/services/whatsapp-message";
import { formatCartMoney } from "@/components/tenant/cart/utils/format-cart-money";

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

describe("generateWSMessage detalle del pedido", () => {
	it("separa cantidad y precio de cada línea con un punto medio", () => {
		const msg = generateWSMessage(
			{ name: "Ana", rut: "", phone: "" },
			[
				{ name: "Pizza Margarita", quantity: 2, lineTotal: 12000, details: ["Sin cebolla"] },
				{ name: "Bebida", quantity: 1 },
			],
			12000,
			"efectivo",
			"",
			"Rica Pizza",
			undefined,
			{
				fulfillment: "pickup",
				cartSubtotal: 12000,
				deliveryFee: 0,
				grandTotal: 12000,
				currency: "CLP",
				country: "CL",
				paymentMethodKey: "efectivo",
			},
			undefined,
			"Efectivo",
		);

		expect(msg).toContain(`*2x Pizza Margarita* · ${formatCartMoney(12000, "CLP")}`);
		expect(msg).toContain("   ↳ Sin cebolla");
		// Sin total de línea no hay separador ni precio.
		expect(msg).toContain("*1x Bebida*\n");
		expect(msg).not.toContain(" — ");
	});
});
