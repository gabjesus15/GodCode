import { describe, expect, it } from "vitest";

import { mergeCustomLinesForRpc } from "@/lib/orders/merge-custom-lines-for-rpc";

describe("mergeCustomLinesForRpc", () => {
	it("folds custom lines into the first catalog line extras_total", () => {
		const merged = mergeCustomLinesForRpc(
			[
				{
					id: "11111111-1111-4111-8111-111111111111",
					name: "Burger",
					quantity: 1,
					price: 2500,
					extras_total: 0,
				},
			],
			[
				{
					id: "menu-extra-003",
					name: "Papas",
					quantity: 1,
					price: 3000,
					custom_item: true,
				},
			],
		);

		expect(merged).toHaveLength(1);
		expect(merged[0]?.extras_total).toBe(3000);
		expect(merged[0]?.extras).toHaveLength(1);
	});

	it("throws when only custom lines are present", () => {
		expect(() =>
			mergeCustomLinesForRpc(
				[],
				[{ id: "menu-extra-003", name: "Papas", quantity: 1, price: 3000, custom_item: true }],
			),
		).toThrow(/producto del menu/i);
	});
});
