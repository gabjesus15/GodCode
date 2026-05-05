import { describe, expect, it } from "vitest";

import { normalizeExtrasPayload } from "@/components/tenant/data/orders/build-order-items-from-branch";

describe("normalizeExtrasPayload", () => {
	it("returns empty array for non-arrays", () => {
		expect(normalizeExtrasPayload(null)).toEqual([]);
		expect(normalizeExtrasPayload({})).toEqual([]);
		expect(normalizeExtrasPayload("x")).toEqual([]);
	});

	it("normalizes valid entries and drops filas sin id", () => {
		expect(
			normalizeExtrasPayload([
				{ id: "e1", name: "Queso", price: 500, qty: 2 },
				{ id: "", name: "Sin id", price: 100 },
				{ price: 50 },
			]),
		).toEqual([{ id: "e1", name: "Queso", price: 500, qty: 2 }]);
	});

	it("coerces price and qty with floors", () => {
		expect(normalizeExtrasPayload([{ id: "x", name: "A", price: -10, qty: 0 }])).toEqual([
			{ id: "x", name: "A", price: 0, qty: 1 },
		]);
	});
});
