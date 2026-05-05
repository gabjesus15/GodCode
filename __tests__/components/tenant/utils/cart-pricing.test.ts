import { describe, expect, it } from "vitest";
import { mergeCartWithBranchPrices } from "../../../../components/tenant/cart/utils/cart-pricing";

describe("mergeCartWithBranchPrices", () => {
	it("keeps synthetic beverage lines and drops missing branch products", () => {
		const cart = [
			{
				id: "11111111-1111-4111-8111-111111111111",
				name: "Pizza",
				price: 1000,
				is_active: true,
			},
			{
				id: "22222222-2222-4222-8222-222222222222",
				name: "Burger",
				price: 1200,
				is_active: true,
			},
			{
				id: "upsell_beverage_coke",
				name: "Coke",
				price: 800,
				is_active: true,
			},
		];

		const rows = [
			{
				product_id: "11111111-1111-4111-8111-111111111111",
				price: 950,
				has_discount: false,
				discount_price: null,
				products: {
					id: "11111111-1111-4111-8111-111111111111",
					name: "Pizza Especial",
					is_active: true,
					description: "",
				},
			},
		];

		const merged = mergeCartWithBranchPrices(cart, rows, {
			omitLinesWithoutPriceWhenBranchHasData: true,
		});

		expect(merged).toHaveLength(2);
		expect(merged.map((item) => item.id)).toEqual([
			"11111111-1111-4111-8111-111111111111",
			"upsell_beverage_coke",
		]);
		expect(merged[0]).toMatchObject({
			name: "Pizza Especial",
			price: 950,
		});
		expect(merged[1]).toMatchObject({
			name: "Coke",
			price: 800,
		});
	});
});
