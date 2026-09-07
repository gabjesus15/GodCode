import { describe, expect, it } from "vitest";

import { mergeCustomLinesForRpc } from "@/lib/orders/merge-custom-lines-for-rpc";

describe("mergeCustomLinesForRpc", () => {
	it("appends custom lines as their own extra lines", () => {
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
					is_extra: true,
					manual_order_source: "extras",
				},
			],
		);

		expect(merged).toHaveLength(2);
		expect(merged[0]?.id).toBe("11111111-1111-4111-8111-111111111111");
		expect(merged[0]?.extras_total).toBe(0);
		expect(merged[1]?.id).toBe("menu-extra-003");
		expect(merged[1]?.is_extra).toBe(true);
		expect(merged[1]?.manual_order_source).toBe("extras");
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
