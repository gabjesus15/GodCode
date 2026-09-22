import { describe, expect, it } from "vitest";

import {
	isPresentialMethodConfigured,
	resolveBranchPaymentMethods,
	resolveCheckoutPaymentMethods,
} from "@/components/tenant/cart/utils/checkout-payment-methods";
import { normalizeDeliverySettings } from "@/lib/delivery/delivery-settings";

describe("isPresentialMethodConfigured", () => {
	it("treats null, empty and empty objects as not configured", () => {
		expect(isPresentialMethodConfigured(null)).toBe(false);
		expect(isPresentialMethodConfigured(undefined)).toBe(false);
		expect(isPresentialMethodConfigured("")).toBe(false);
		expect(isPresentialMethodConfigured("   ")).toBe(false);
		expect(isPresentialMethodConfigured("{}")).toBe(false);
		expect(isPresentialMethodConfigured({})).toBe(false);
		expect(isPresentialMethodConfigured(false)).toBe(false);
		expect(isPresentialMethodConfigured("false")).toBe(false);
	});

	it("treats non-empty objects, booleans and serialized JSON as configured", () => {
		expect(isPresentialMethodConfigured({ enabled: true })).toBe(true);
		expect(isPresentialMethodConfigured('{"enabled":true}')).toBe(true);
		expect(isPresentialMethodConfigured(true)).toBe(true);
		expect(isPresentialMethodConfigured("true")).toBe(true);
		expect(isPresentialMethodConfigured("si")).toBe(true);
	});
});

describe("resolveBranchPaymentMethods", () => {
	it("adds presential methods once and drops junk entries", () => {
		const methods = resolveBranchPaymentMethods({
			payment_methods: ["pago_movil", "efectivo", "", "pago_movil"],
			efectivo: { enabled: true },
			tarjeta: '{"pos":"verifone"}',
		});
		expect(methods).toEqual(["pago_movil", "efectivo", "tarjeta"]);
	});

	it("returns an empty list for a missing branch", () => {
		expect(resolveBranchPaymentMethods(null)).toEqual([]);
		expect(resolveBranchPaymentMethods({ payment_methods: null })).toEqual([]);
	});
});

describe("resolveCheckoutPaymentMethods", () => {
	it("keeps every branch method for pickup", () => {
		const settings = normalizeDeliverySettings({});
		const methods = resolveCheckoutPaymentMethods(
			{ payment_methods: ["zelle"], efectivo: true },
			settings,
			"pickup",
		);
		expect(methods).toEqual(["zelle", "efectivo"]);
	});
});
