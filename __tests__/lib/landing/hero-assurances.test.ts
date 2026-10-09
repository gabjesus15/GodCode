import { describe, expect, it } from "vitest";

import {
	HERO_ASSURANCE_FIRST_PAYMENT_PROMO,
	HERO_ASSURANCE_FREE_UNTIL_PUBLISHED,
	HERO_ASSURANCE_NO_LOCK_IN,
	buildHeroAssurances,
} from "@/lib/landing/hero-assurances";

describe("buildHeroAssurances", () => {
	it("la home lleva las tres garantías con el precio en medio", () => {
		expect(buildHeroAssurances({ price: 19, currency: "USD" })).toEqual([
			HERO_ASSURANCE_FREE_UNTIL_PUBLISHED,
			"Desde $19 USD/mes",
			HERO_ASSURANCE_NO_LOCK_IN,
		]);
	});

	it("sin precio conocido quedan las otras dos", () => {
		expect(buildHeroAssurances(null)).toEqual([HERO_ASSURANCE_FREE_UNTIL_PUBLISHED, HERO_ASSURANCE_NO_LOCK_IN]);
	});

	it("las páginas de país añaden la promo al final sin quitar nada", () => {
		const items = buildHeroAssurances({ price: 19, currency: "USD" }, [HERO_ASSURANCE_FIRST_PAYMENT_PROMO]);
		expect(items).toHaveLength(4);
		expect(items.at(-1)).toBe("2 meses al precio de 1 en tu primer pago");
		expect(items.slice(0, 3)).toEqual(buildHeroAssurances({ price: 19, currency: "USD" }));
	});
});
