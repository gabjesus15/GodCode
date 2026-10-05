import { describe, expect, it } from "vitest";

import {
	checkCouponFit,
	checkCouponWindow,
	computeCouponPricing,
	couponGrantFromRow,
	describeCouponValueEs,
	generateCouponCode,
	isValidCouponCode,
	normalizeCouponCode,
	resolveOnboardingGrant,
	toAppliedCoupon,
	type SubscriptionCouponRow,
} from "@/lib/billing/subscription-coupons";

function coupon(overrides: Partial<SubscriptionCouponRow> = {}): SubscriptionCouponRow {
	return {
		id: "c1",
		code: "LANZAMIENTO20",
		description: null,
		kind: "percent",
		value: 20,
		min_months: 1,
		plan_ids: null,
		keeps_promo: true,
		max_redemptions: null,
		redemptions_count: 0,
		valid_from: null,
		valid_until: null,
		is_active: true,
		...overrides,
	};
}

const NOW = new Date("2026-10-06T12:00:00Z");

describe("normalizeCouponCode / isValidCouponCode", () => {
	it("pone en mayúsculas y quita espacios", () => {
		expect(normalizeCouponCode("  lanza miento-20 ")).toBe("LANZAMIENTO-20");
	});

	it("acepta de 4 a 32 caracteres con letras, números, guion y guion bajo", () => {
		expect(isValidCouponCode("ABCD")).toBe(true);
		expect(isValidCouponCode("A_B-1")).toBe(true);
		expect(isValidCouponCode("ABC")).toBe(false);
		expect(isValidCouponCode("-ABCD")).toBe(false);
		expect(isValidCouponCode("A".repeat(33))).toBe(false);
		expect(isValidCouponCode("HOLA MUNDO")).toBe(false);
		expect(isValidCouponCode("ÑANDÚ")).toBe(false);
	});

	it("genera códigos válidos sin caracteres confusos", () => {
		const code = generateCouponCode(8, () => 0.999);
		expect(code).toHaveLength(8);
		expect(isValidCouponCode(code)).toBe(true);
		expect(generateCouponCode(10)).not.toMatch(/[01IO]/);
	});
});

describe("checkCouponWindow", () => {
	it("rechaza inactivo, no empezado, vencido y agotado", () => {
		expect(checkCouponWindow(coupon({ is_active: false }), NOW)).toBe("inactive");
		expect(checkCouponWindow(coupon({ valid_from: "2026-11-01T00:00:00Z" }), NOW)).toBe("not_started");
		expect(checkCouponWindow(coupon({ valid_until: "2026-10-01T00:00:00Z" }), NOW)).toBe("expired");
		expect(checkCouponWindow(coupon({ max_redemptions: 2, redemptions_count: 2 }), NOW)).toBe("exhausted");
	});

	it("acepta uno vigente con cupo", () => {
		expect(checkCouponWindow(coupon({ valid_from: "2026-10-01T00:00:00Z", valid_until: "2026-12-31T00:00:00Z", max_redemptions: 5, redemptions_count: 4 }), NOW)).toBeNull();
	});
});

describe("checkCouponFit", () => {
	it("limita por plan y por meses mínimos", () => {
		expect(checkCouponFit(coupon({ plan_ids: ["p1"] }), { planId: "p2" })).toBe("plan_not_allowed");
		expect(checkCouponFit(coupon({ plan_ids: ["p1"] }), { planId: "p1" })).toBeNull();
		expect(checkCouponFit(coupon({ min_months: 3 }), { planId: "p1", months: 1 })).toBe("min_months");
		expect(checkCouponFit(coupon({ min_months: 3 }), { planId: "p1", months: 3 })).toBeNull();
		// Sin meses todavía no se revisa el mínimo (la página lo hace al elegirlos).
		expect(checkCouponFit(coupon({ min_months: 3 }), { planId: "p1" })).toBeNull();
	});
});

describe("computeCouponPricing", () => {
	it("porcentaje: redondea a centavos y nunca baja de 0", () => {
		expect(computeCouponPricing(coupon({ kind: "percent", value: 20 }), 57)).toEqual({ baseAmountUsd: 57, discountUsd: 11.4, amountUsd: 45.6, freeMonths: 0 });
		expect(computeCouponPricing(coupon({ kind: "percent", value: 33 }), 19.99).discountUsd).toBe(6.6);
		expect(computeCouponPricing(coupon({ kind: "percent", value: 100 }), 19).amountUsd).toBe(0);
	});

	it("monto fijo: tope en el total", () => {
		expect(computeCouponPricing(coupon({ kind: "fixed", value: 5 }), 19)).toEqual({ baseAmountUsd: 19, discountUsd: 5, amountUsd: 14, freeMonths: 0 });
		expect(computeCouponPricing(coupon({ kind: "fixed", value: 50 }), 19)).toEqual({ baseAmountUsd: 19, discountUsd: 19, amountUsd: 0, freeMonths: 0 });
	});

	it("meses gratis: no toca el importe", () => {
		expect(computeCouponPricing(coupon({ kind: "free_months", value: 2 }), 19)).toEqual({ baseAmountUsd: 19, discountUsd: 0, amountUsd: 19, freeMonths: 2 });
	});

	it("sin cupón devuelve el total tal cual", () => {
		expect(computeCouponPricing(null, 19.5)).toEqual({ baseAmountUsd: 19.5, discountUsd: 0, amountUsd: 19.5, freeMonths: 0 });
	});
});

describe("resolveOnboardingGrant", () => {
	it("sin cupón es la promo de siempre", () => {
		expect(resolveOnboardingGrant({ monthsPaid: 3, promoEligible: true })).toEqual({ chargedMonths: 3, grantedMonths: 4, promoApplied: true, couponFreeMonths: 0 });
		expect(resolveOnboardingGrant({ monthsPaid: 3, promoEligible: false })).toEqual({ chargedMonths: 3, grantedMonths: 3, promoApplied: false, couponFreeMonths: 0 });
	});

	it("los meses gratis del cupón se suman a la promo", () => {
		const grant = resolveOnboardingGrant({ monthsPaid: 1, promoEligible: true, coupon: couponGrantFromRow(coupon({ kind: "free_months", value: 2 })) });
		expect(grant).toEqual({ chargedMonths: 1, grantedMonths: 4, promoApplied: true, couponFreeMonths: 2 });
	});

	it("un cupón que no mantiene la promo la apaga aunque el correo sea elegible", () => {
		const grant = resolveOnboardingGrant({ monthsPaid: 1, promoEligible: true, coupon: couponGrantFromRow(coupon({ keeps_promo: false })) });
		expect(grant).toEqual({ chargedMonths: 1, grantedMonths: 1, promoApplied: false, couponFreeMonths: 0 });
	});

	it("un cupón de descuento no cambia los meses", () => {
		const grant = resolveOnboardingGrant({ monthsPaid: 6, promoEligible: false, coupon: couponGrantFromRow(coupon({ kind: "fixed", value: 10 })) });
		expect(grant).toEqual({ chargedMonths: 6, grantedMonths: 6, promoApplied: false, couponFreeMonths: 0 });
	});
});

describe("presentación", () => {
	it("toAppliedCoupon expone solo lo que la página necesita", () => {
		expect(toAppliedCoupon(coupon({ description: "Campaña octubre", min_months: 3, keeps_promo: false }))).toEqual({
			id: "c1",
			code: "LANZAMIENTO20",
			kind: "percent",
			value: 20,
			description: "Campaña octubre",
			minMonths: 3,
			keepsPromo: false,
		});
	});

	it("describe el valor en español", () => {
		expect(describeCouponValueEs(coupon({ kind: "percent", value: 20 }))).toBe("20 % de descuento");
		expect(describeCouponValueEs(coupon({ kind: "percent", value: 12.5 }))).toBe("12.5 % de descuento");
		expect(describeCouponValueEs(coupon({ kind: "fixed", value: 5 }))).toBe("$5 de descuento");
		expect(describeCouponValueEs(coupon({ kind: "fixed", value: 7.5 }))).toBe("$7.50 de descuento");
		expect(describeCouponValueEs(coupon({ kind: "free_months", value: 1 }))).toBe("1 mes gratis");
		expect(describeCouponValueEs(coupon({ kind: "free_months", value: 3 }))).toBe("3 meses gratis");
	});
});
