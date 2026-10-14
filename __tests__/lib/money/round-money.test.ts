import { describe, expect, it } from "vitest";

import { orderItemsSubtotalFromPayload } from "@/lib/delivery/delivery-settings";
import { moneyFractionDigits, roundMoney, roundToCents } from "@/lib/money/round-money";

describe("redondeo según la moneda", () => {
	it("dólares con centavos, pesos chilenos sin decimales", () => {
		expect(roundMoney(12.99 + 8.5, "USD")).toBe(21.49);
		expect(roundMoney(0.1 + 0.2, "USD")).toBe(0.3);
		expect(roundMoney(12_990.4, "CLP")).toBe(12_990);
		expect(roundMoney(12_990.5, "CLP")).toBe(12_991);
		expect(moneyFractionDigits("CLP")).toBe(0);
		expect(moneyFractionDigits("USD")).toBe(2);
	});

	it("con una moneda inválida no pierde los centavos", () => {
		expect(roundMoney(9.99, "")).toBe(9.99);
		expect(roundMoney(9.99, "XX")).toBe(9.99);
		expect(roundToCents(1.005)).toBe(1.01);
	});

	it("el subtotal del servidor ya no redondea al dólar", () => {
		const items = [
			{ price: 12.99, quantity: 1 },
			{ price: 8.5, quantity: 1 },
		];
		expect(orderItemsSubtotalFromPayload(items as never)).toBe(21.49);
		expect(orderItemsSubtotalFromPayload([{ price: 8990, quantity: 2 }] as never)).toBe(17_980);
	});
});
