import { describe, expect, it } from "vitest";

import {
	isVenezuelaCountry,
	paymentMethodUsesBolivaresInVenezuela,
	paymentMethodUsesUsdInVenezuela,
	resolvePaymentAmountCopyValue,
	resolvePaymentAmountDisplay,
	resolvePaymentAmountMessageValue,
} from "@/components/tenant/cart/utils/venezuela-payment-copy";

describe("venezuela-payment-copy", () => {
	it("detects Venezuela country codes", () => {
		expect(isVenezuelaCountry("VE")).toBe(true);
		expect(isVenezuelaCountry("Venezuela")).toBe(true);
		expect(isVenezuelaCountry("CL")).toBe(false);
	});

	it("classifies local vs foreign payment methods", () => {
		expect(paymentMethodUsesBolivaresInVenezuela("pago_movil")).toBe(true);
		expect(paymentMethodUsesBolivaresInVenezuela("transferencia_bancaria")).toBe(true);
		expect(paymentMethodUsesUsdInVenezuela("zelle")).toBe(true);
		expect(paymentMethodUsesUsdInVenezuela("paypal")).toBe(true);
	});

	it("shows dual currency in Venezuela display", () => {
		expect(
			resolvePaymentAmountDisplay({
				cartTotal: 2500,
				currency: "USD",
				exchangeRate: 639.7,
				country: "VE",
			}),
		).toContain("/");
	});

	it("copies bolivares for pago movil in Venezuela", () => {
		const value = resolvePaymentAmountCopyValue({
			methodKey: "pago_movil",
			cartTotal: 2500,
			currency: "USD",
			exchangeRate: 639.703,
			country: "VE",
		});
		expect(value).toBe("1.599.257,50");
		expect(value).not.toContain("Bs.");
		expect(value).not.toContain("/");
		expect(value).not.toContain("$");
	});

	it("copies dollars for zelle in Venezuela", () => {
		const value = resolvePaymentAmountCopyValue({
			methodKey: "zelle",
			cartTotal: 2500,
			currency: "USD",
			exchangeRate: 639.703,
			country: "VE",
		});
		expect(value).toBe("$2,500.00");
		expect(value).not.toContain("Bs.");
	});

	it("keeps single currency outside Venezuela", () => {
		const value = resolvePaymentAmountCopyValue({
			methodKey: "pago_movil",
			cartTotal: 2500,
			currency: "CLP",
			exchangeRate: null,
			country: "CL",
		});
		expect(value).toBe("CLP 2.500");
	});

	it("formats WhatsApp total in bolivares for pago movil", () => {
		const value = resolvePaymentAmountMessageValue({
			methodKey: "pago_movil",
			grandTotal: 2500,
			currency: "USD",
			exchangeRate: 639.703,
			country: "VE",
			localTotal: 1599257.25,
			localCurrency: "VES",
		});
		expect(value).toContain("Bs.");
		expect(value).toContain("$2,500.00");
	});

	it("formats WhatsApp total in dollars for zelle", () => {
		const value = resolvePaymentAmountMessageValue({
			methodKey: "zelle",
			grandTotal: 2500,
			currency: "USD",
			exchangeRate: 639.703,
			country: "VE",
		});
		expect(value).toBe("$2,500.00");
	});
});
