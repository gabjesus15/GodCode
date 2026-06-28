import { describe, expect, it, vi } from "vitest";

import { isFirstPaymentPromoEligible } from "@/lib/onboarding/first-payment-promo-service";

function mockSupabase(companyWithPromo: { id: string } | null) {
	return {
		from: () => ({
			select: () => ({
				ilike: () => ({
					not: () => ({
						maybeSingle: async () => ({ data: companyWithPromo }),
					}),
				}),
			}),
		}),
	} as never;
}

describe("isFirstPaymentPromoEligible", () => {
	it("returns false when email already consumed promo on any company", async () => {
		const eligible = await isFirstPaymentPromoEligible(mockSupabase({ id: "company-a" }), {
			email: "test@example.com",
			excludeCompanyId: "company-a",
		});
		expect(eligible).toBe(false);
	});

	it("returns true when no company has used promo for email", async () => {
		const eligible = await isFirstPaymentPromoEligible(mockSupabase(null), {
			email: "new@example.com",
		});
		expect(eligible).toBe(true);
	});

	it("returns false for empty email", async () => {
		const eligible = await isFirstPaymentPromoEligible(mockSupabase(null), {
			email: "   ",
		});
		expect(eligible).toBe(false);
	});
});
