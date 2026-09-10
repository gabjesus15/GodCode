import { describe, expect, it } from "vitest";

import { computeCouponDiscountAmount } from "@/lib/discount/compute-coupon-discount";
import {
	COUPON_DISCOUNT_CONTRACT_CASES,
} from "@/lib/discount/coupon-discount-contract-cases";

/**
 * Contrato del descuento de cupón.
 *
 * El mismo fichero de casos vive en el Panel POS y alimenta allí un test
 * idéntico. Mientras los dos pasen, las dos implementaciones coinciden.
 */
describe("computeCouponDiscountAmount — contrato compartido con el Panel POS", () => {
	for (const testCase of COUPON_DISCOUNT_CONTRACT_CASES) {
		it(testCase.name, () => {
			expect(
				computeCouponDiscountAmount(
					testCase.subtotal,
					testCase.discountType,
					testCase.discountValue,
				),
			).toBe(testCase.expected);
		});
	}

	it("nunca devuelve un descuento negativo", () => {
		for (const testCase of COUPON_DISCOUNT_CONTRACT_CASES) {
			const result = computeCouponDiscountAmount(
				testCase.subtotal,
				testCase.discountType,
				testCase.discountValue,
			);
			expect(result).toBeGreaterThanOrEqual(0);
		}
	});

	it("nunca descuenta más que el subtotal", () => {
		for (const testCase of COUPON_DISCOUNT_CONTRACT_CASES) {
			const subtotal = Number(testCase.subtotal);
			if (!Number.isFinite(subtotal) || subtotal <= 0) continue;
			const result = computeCouponDiscountAmount(
				testCase.subtotal,
				testCase.discountType,
				testCase.discountValue,
			);
			expect(result).toBeLessThanOrEqual(subtotal);
		}
	});
});
