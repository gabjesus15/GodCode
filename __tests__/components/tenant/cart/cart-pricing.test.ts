import { describe, expect, it } from "vitest";

import { mergeCartWithBranchPrices } from "@/components/tenant/cart/utils/cart-pricing";

describe("mergeCartWithBranchPrices", () => {
	it("omits lines without branch price when branch data exists", () => {
		const cart = [
			{
				lineId: "a",
				id: "11111111-1111-4111-8111-111111111111",
				name: "Burger",
				quantity: 1,
				price: 10,
			},
			{
				lineId: "b",
				id: "22222222-2222-4222-8222-222222222222",
				name: "Soda",
				quantity: 1,
				price: 0,
			},
		];

		const merged = mergeCartWithBranchPrices(
			cart as never,
			[{ product_id: "11111111-1111-4111-8111-111111111111", price: 12, has_discount: false, discount_price: null }],
			{
				omitLinesWithoutPriceWhenBranchHasData: true,
			},
		);

		expect(merged).toHaveLength(1);
		expect(merged[0]?.id).toBe("11111111-1111-4111-8111-111111111111");
	});

	it("omits catalog lines with stale stored price when branch has no row for that product", () => {
		const cart = [
			{
				lineId: "a",
				id: "22222222-2222-4222-8222-222222222222",
				name: "Soda",
				quantity: 1,
				price: 5990,
			},
		];

		const merged = mergeCartWithBranchPrices(
			cart as never,
			[{ product_id: "11111111-1111-4111-8111-111111111111", price: 12, has_discount: false, discount_price: null }],
			{ omitLinesWithoutPriceWhenBranchHasData: true },
		);

		expect(merged).toHaveLength(0);
	});
});
