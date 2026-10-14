import { describe, expect, it } from "vitest";

import {
	earnRuleInputToRow,
	isPromoRule,
	isRuleExpired,
	isRuleLive,
	loyaltyEarnRuleInputSchema,
} from "@/lib/loyalty/earn-rules-shared";

const PRODUCT = "4c23107f-c032-4520-b82a-b6af6ad56177";
const CATEGORY = "971d2b95-268d-47f5-8da5-048340727327";

describe("loyaltyEarnRuleInputSchema", () => {
	it("acepta una regla global por dinero gastado", () => {
		const parsed = loyaltyEarnRuleInputSchema.safeParse({ scope: "global", mode: "per_amount", points: 1, perAmount: 1000 });
		expect(parsed.success).toBe(true);
	});

	it("la global por monto necesita el monto, y la global no puede dar 0", () => {
		expect(loyaltyEarnRuleInputSchema.safeParse({ scope: "global", mode: "per_amount", points: 1 }).success).toBe(false);
		expect(loyaltyEarnRuleInputSchema.safeParse({ scope: "global", mode: "per_order", points: 0 }).success).toBe(false);
	});

	it("producto y categoría necesitan su objetivo; pueden dar 0 (promo que quita puntos)", () => {
		expect(loyaltyEarnRuleInputSchema.safeParse({ scope: "product", points: 5 }).success).toBe(false);
		expect(loyaltyEarnRuleInputSchema.safeParse({ scope: "category", points: 5 }).success).toBe(false);
		expect(loyaltyEarnRuleInputSchema.safeParse({ scope: "product", points: 0, productId: PRODUCT }).success).toBe(true);
	});

	it("rechaza fechas al revés y puntos con decimales", () => {
		expect(
			loyaltyEarnRuleInputSchema.safeParse({
				scope: "category",
				categoryId: CATEGORY,
				points: 2,
				startsAt: "2026-10-31T00:00:00.000Z",
				endsAt: "2026-10-01T00:00:00.000Z",
			}).success,
		).toBe(false);
		expect(loyaltyEarnRuleInputSchema.safeParse({ scope: "product", productId: PRODUCT, points: 1.5 }).success).toBe(false);
	});
});

describe("earnRuleInputToRow", () => {
	it("deja en null lo que no corresponde al tipo", () => {
		const row = earnRuleInputToRow({
			scope: "product",
			productId: PRODUCT,
			categoryId: CATEGORY,
			mode: "per_amount",
			perAmount: 1000,
			points: 3,
		});
		expect(row).toMatchObject({ scope: "product", product_id: PRODUCT, category_id: null, mode: null, per_amount: null });
	});

	it("la global por compra no guarda monto", () => {
		const row = earnRuleInputToRow({ scope: "global", mode: "per_order", perAmount: 500, points: 10 });
		expect(row).toMatchObject({ mode: "per_order", per_amount: null, is_active: true });
	});
});

describe("vigencia", () => {
	const now = new Date("2026-10-15T12:00:00Z").getTime();
	const promo = { isActive: true, startsAt: "2026-10-01T00:00:00Z", endsAt: "2026-10-31T23:59:59Z" };

	it("con fechas es promoción", () => {
		expect(isPromoRule(promo)).toBe(true);
		expect(isPromoRule({ startsAt: null, endsAt: null })).toBe(false);
	});

	it("vale dentro de sus fechas y solo si está activa", () => {
		expect(isRuleLive(promo, now)).toBe(true);
		expect(isRuleLive({ ...promo, isActive: false }, now)).toBe(false);
		expect(isRuleLive({ ...promo, startsAt: "2026-10-20T00:00:00Z" }, now)).toBe(false);
		expect(isRuleExpired({ endsAt: "2026-10-10T00:00:00Z" }, now)).toBe(true);
	});
});
