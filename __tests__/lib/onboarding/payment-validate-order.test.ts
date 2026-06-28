import { describe, expect, it } from "vitest";

import { resolveFirstPaymentPromo } from "@/lib/onboarding/first-payment-promo";

/**
 * Documenta el orden esperado en validate: primero marcar paid, luego promo y suscripción.
 */
describe("payment validate ordering contract", () => {
	it("grantedMonths refleja promo antes de activar suscripción", () => {
		const monthsPaid = 1;
		const promo = resolveFirstPaymentPromo(monthsPaid, true);
		expect(promo.promoApplied).toBe(true);
		expect(promo.grantedMonths).toBe(2);
		expect(promo.grantedMonths).toBeGreaterThan(promo.chargedMonths);
	});

	it("sin promo grantedMonths igual a meses pagados", () => {
		const promo = resolveFirstPaymentPromo(3, false);
		expect(promo.grantedMonths).toBe(3);
		expect(promo.promoApplied).toBe(false);
	});
});
