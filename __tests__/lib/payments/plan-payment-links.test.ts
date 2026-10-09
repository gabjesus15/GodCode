import { describe, expect, it } from "vitest";

import { isLinkMethod, planLinkConfigKey, resolvePlanPaymentLink } from "@/lib/payments/plan-payment-links";

describe("plan-payment-links", () => {
	it("reconoce Mercado Pago como método por enlace", () => {
		expect(isLinkMethod("mercadopago")).toBe(true);
		expect(isLinkMethod(" MercadoPago ")).toBe(true);
		expect(isLinkMethod("paypal")).toBe(false);
		expect(isLinkMethod(null)).toBe(false);
	});

	it("arma la clave del plan sin tildes ni espacios", () => {
		expect(planLinkConfigKey("Básico")).toBe("link_basico");
		expect(planLinkConfigKey("Business")).toBe("link_business");
	});

	it("devuelve el enlace del plan, también con el prefijo 'Plan'", () => {
		const config = { link_basico: "https://mpago.la/1GAqKHo", link_avanzado: "https://mpago.la/2XrsmRp" };
		expect(resolvePlanPaymentLink(config, "Basico")).toBe("https://mpago.la/1GAqKHo");
		expect(resolvePlanPaymentLink(config, "Plan Avanzado")).toBe("https://mpago.la/2XrsmRp");
		expect(resolvePlanPaymentLink(config, "Business")).toBeNull();
	});

	it("ignora enlaces que no son https", () => {
		expect(resolvePlanPaymentLink({ link_basico: "javascript:alert(1)" }, "Basico")).toBeNull();
		expect(resolvePlanPaymentLink({ link_basico: "http://mpago.la/x" }, "Basico")).toBeNull();
	});
});
