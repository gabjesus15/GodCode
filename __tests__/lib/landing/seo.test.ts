import { describe, expect, it } from "vitest";

import { LANDING_BRAND_ALTERNATE, LANDING_BRAND_NAME } from "@/lib/landing/brand";
import { LANDING_FAQ } from "@/lib/landing/faq";
import { buildLandingJsonLd } from "@/lib/landing/json-ld";
import { buildLandingMetadata } from "@/lib/landing/metadata";

describe("landing SEO artifacts", () => {
	it("metadata uses single Spanish canonical without fake hreflang variants", () => {
		const meta = buildLandingMetadata("https://godcode.me");
		expect(meta.alternates?.canonical).toBe("https://godcode.me/");
		expect(meta.alternates?.languages).toEqual({
			es: "https://godcode.me/",
			"x-default": "https://godcode.me/",
		});
		expect(meta.openGraph?.locale).toBe("es_ES");
		expect(meta.applicationName).toBe(LANDING_BRAND_NAME);
	});

	it("JSON-LD excludes SearchAction and uses AggregateOffer with realistic pricing", () => {
		const ld = buildLandingJsonLd({
			base: "https://godcode.me",
			faq: LANDING_FAQ,
			plans: [
				{
					id: "basic",
					name: "Básico",
					pricesByContinent: { "Latinoamérica": { price: 19, currency: "USD" } },
					max_branches: 1,
					max_users: 2,
					featureBullets: ["1 sucursal"],
				},
				{
					id: "pro",
					name: "Pro",
					pricesByContinent: { "Latinoamérica": { price: 39, currency: "USD" } },
					max_branches: 3,
					max_users: 5,
					featureBullets: ["3 sucursales"],
				},
			],
			country: "CL",
		});

		const serialized = JSON.stringify(ld);
		expect(serialized).not.toContain("SearchAction");
		expect(serialized).not.toContain('"price":"0"');

		const software = ld[0] as Record<string, unknown>;
		expect(software.name).toBe(LANDING_BRAND_NAME);
		expect(software.alternateName).toBe(LANDING_BRAND_ALTERNATE);

		const offers = software.offers as Record<string, unknown>;
		expect(offers["@type"]).toBe("AggregateOffer");
		expect(offers.lowPrice).toBe("19");
		expect(offers.priceCurrency).toBe("USD");

		const org = ld[2] as Record<string, unknown>;
		expect(org.alternateName).toBe(LANDING_BRAND_ALTERNATE);

		const faqPage = ld[3] as { mainEntity: { name: string }[] };
		expect(faqPage.mainEntity).toHaveLength(LANDING_FAQ.length);
		expect(faqPage.mainEntity[0]?.name).toBe(LANDING_FAQ[0]?.question);
	});

	it("FAQ has six entries for rich results parity", () => {
		expect(LANDING_FAQ.length).toBe(6);
	});
});
