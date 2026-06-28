import { describe, it, expect } from "vitest";

import { resolveFirstPaymentPromo } from "@/lib/onboarding/first-payment-promo";

describe("resolveFirstPaymentPromo", () => {
	it("paga 1 mes en primera compra y recibe 2", () => {
		expect(resolveFirstPaymentPromo(1, true)).toEqual({
			chargedMonths: 1,
			grantedMonths: 2,
			promoApplied: true,
		});
	});

	it("paga 3 meses en primera compra y recibe 4", () => {
		expect(resolveFirstPaymentPromo(3, true)).toEqual({
			chargedMonths: 3,
			grantedMonths: 4,
			promoApplied: true,
		});
	});

	it("limita a 12 meses pagados y otorga 13 en promo", () => {
		expect(resolveFirstPaymentPromo(24, true)).toEqual({
			chargedMonths: 12,
			grantedMonths: 13,
			promoApplied: true,
		});
	});

	it("no aplica promo en renovaciones", () => {
		expect(resolveFirstPaymentPromo(3, false)).toEqual({
			chargedMonths: 3,
			grantedMonths: 3,
			promoApplied: false,
		});
	});

	it("normaliza meses menores a 1 a 1 cuando aplica promo", () => {
		expect(resolveFirstPaymentPromo(0, true)).toEqual({
			chargedMonths: 1,
			grantedMonths: 2,
			promoApplied: true,
		});
	});
});
