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
		expect(software.image).toBe("https://godcode.me/logo.png");

		const offers = software.offers as Record<string, unknown>;
		expect(offers["@type"]).toBe("AggregateOffer");
		expect(offers.lowPrice).toBe("19");
		expect(offers.priceCurrency).toBe("USD");

		const org = ld[2] as Record<string, unknown>;
		expect(org.alternateName).toBe(LANDING_BRAND_ALTERNATE);
		expect(org.logo).toEqual({
			"@type": "ImageObject",
			url: "https://godcode.me/logo.png",
		});
		expect(Array.isArray(org.sameAs)).toBe(true);
		expect((org.sameAs as string[]).some((u) => u.includes("instagram"))).toBe(true);

		const faqPage = ld[3] as { mainEntity: { name: string }[] };
		expect(faqPage.mainEntity).toHaveLength(LANDING_FAQ.length);
		expect(faqPage.mainEntity[0]?.name).toBe(LANDING_FAQ[0]?.question);
	});

	it("FAQ has six entries for rich results parity", () => {
		expect(LANDING_FAQ.length).toBe(6);
	});

	it("metadata uses a short absolute title and PNG OG image", () => {
		const meta = buildLandingMetadata("https://godcode.me");
		const absolute =
			typeof meta.title === "object" && meta.title && "absolute" in meta.title
				? meta.title.absolute
				: null;
		expect(typeof absolute).toBe("string");
		expect(String(absolute).length).toBeLessThanOrEqual(60);
		expect(String(absolute)).toContain(LANDING_BRAND_NAME);

		const images = meta.openGraph?.images;
		const first = Array.isArray(images) ? images[0] : images;
		expect(first).toMatchObject({
			url: "https://godcode.me/api/system/og",
			type: "image/png",
			width: 1200,
			height: 630,
		});
	});
});
