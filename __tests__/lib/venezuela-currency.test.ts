import { describe, expect, it } from "vitest";

import { formatCartMoney } from "@/components/tenant/cart/utils/format-cart-money";
import { resolvePaymentAmountDisplay } from "@/components/tenant/cart/utils/venezuela-payment-copy";

/**
 * En Venezuela los precios del catálogo están en dólares y los bolívares solo
 * aparecen como conversión en el carrito. `branches.currency` vale "VES" para
 * esas sucursales, así que formatear con ese valor produce "Bs." sobre cifras
 * que son USD: un error de unos 800x al tipo de cambio actual.
 *
 * El menú y el proveedor del carrito resuelven la excepción forzando "USD".
 * Estos tests fijan las dos mitades del comportamiento.
 */
describe("moneda en Venezuela", () => {
	it("formatea dólares con símbolo de dólar", () => {
		expect(formatCartMoney(25, "USD")).toBe("$25.00");
	});

	it("formatea bolívares con prefijo Bs.", () => {
		expect(formatCartMoney(20693.43, "VES")).toContain("Bs.");
	});

	it("muestra el total en dólares y su conversión a bolívares", () => {
		// 25 USD a 827.7371 Bs/USD, la tasa oficial que el carrito pide al abrirse.
		const display = resolvePaymentAmountDisplay({
			cartTotal: 25,
			currency: "USD",
			exchangeRate: 827.7371,
			country: "VE",
		});
		expect(display).toContain("$25.00");
		expect(display).toContain("Bs.");
		expect(display).toContain("/");
	});

	it("sin tasa de cambio muestra solo dólares, sin conversión", () => {
		expect(
			resolvePaymentAmountDisplay({ cartTotal: 25, currency: "USD", exchangeRate: null, country: "VE" }),
		).toBe("$25.00");
	});

	it("una tasa no positiva no produce conversión", () => {
		expect(
			resolvePaymentAmountDisplay({ cartTotal: 25, currency: "USD", exchangeRate: 0, country: "VE" }),
		).toBe("$25.00");
	});
});

describe("moneda en Chile", () => {
	it("formatea pesos sin decimales", () => {
		expect(formatCartMoney(12345, "CLP")).toBe("CLP 12.345");
	});

	it("redondea los decimales que lleguen", () => {
		expect(formatCartMoney(12345.67, "CLP")).toBe("CLP 12.346");
	});

	it("no convierte: fuera de Venezuela se muestra una sola moneda", () => {
		expect(
			resolvePaymentAmountDisplay({ cartTotal: 12345, currency: "CLP", exchangeRate: 900, country: "CL" }),
		).toBe("CLP 12.345");
	});
});
