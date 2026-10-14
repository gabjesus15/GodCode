import { describe, expect, it } from "vitest";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import { buildLandingCountryMetadata } from "@/lib/landing/country-page";
import { LANDING_COUNTRIES } from "@/lib/landing/countries";
import {
	buildEnglishHomeMetadata,
	buildEnglishPageMetadata,
	englishAlternateFor,
	getEnglishPagePath,
} from "@/lib/landing/english-page-seo";
import { LANDING_ENGLISH_HOME, LANDING_ENGLISH_PAGES, LANDING_ENGLISH_SLUGS } from "@/lib/landing/english-pages";
import { buildLandingFeatureMetadata } from "@/lib/landing/feature-page";
import { LANDING_FEATURES } from "@/lib/landing/features";
import { MAIN_DOMAIN_MARKETING_PATHS } from "@/lib/landing/marketing-paths";
import { resolveTenantSlugFromPathname } from "@/lib/tenant/reserved-path-segments";

const BASE = "https://www.godcode.me";
const TITLE_SUFFIX = 3 + LANDING_COMPANY_NAME.length;
const pages = Object.values(LANDING_ENGLISH_PAGES);

describe("páginas en inglés", () => {
	it("el proxy no las trata como tiendas", () => {
		expect(resolveTenantSlugFromPathname("/en")).toBeNull();
		for (const slug of LANDING_ENGLISH_SLUGS) expect(resolveTenantSlugFromPathname(`/en/${slug}`)).toBeNull();
	});

	it("títulos que caben en Google, descripciones útiles y nada repetido", () => {
		for (const page of [...pages, LANDING_ENGLISH_HOME]) {
			expect(page.metaTitle.length + TITLE_SUFFIX).toBeLessThanOrEqual(64);
			expect(page.metaDescription.length).toBeGreaterThanOrEqual(120);
			expect(page.metaDescription.length).toBeLessThanOrEqual(170);
		}
		const titles = pages.flatMap((p) => p.guide.map((g) => g.title));
		expect(new Set(titles).size).toBe(titles.length);
		const questions = [...pages.flatMap((p) => p.faq.map((q) => q.question)), ...LANDING_ENGLISH_HOME.faq.map((q) => q.question)];
		expect(new Set(questions).size).toBe(questions.length);
	});

	it("dice lo que todavía no existe en vez de prometerlo", () => {
		const notYet = LANDING_ENGLISH_HOME.notYet.join(" ");
		expect(notYet).toContain("Card payments inside the menu");
		expect(notYet).toContain("miles");
		const works = LANDING_ENGLISH_HOME.works.join(" ");
		expect(works).not.toMatch(/stripe|apple pay|uber direct/i);
		expect(LANDING_ENGLISH_PAGES["online-ordering"].faq.map((q) => q.answer).join(" ")).toContain("Not yet");
	});

	it("hreflang recíproco: cada página en inglés apunta a su par en español y la española a ella", () => {
		for (const page of pages) {
			expect(MAIN_DOMAIN_MARKETING_PATHS).toContain(page.spanishPath);
			const en = buildEnglishPageMetadata(BASE, page).alternates?.languages as Record<string, string>;
			expect(en.en).toBe(`${BASE}${getEnglishPagePath(page)}`);
			expect(en.es).toBe(`${BASE}${page.spanishPath}`);
			expect(englishAlternateFor(page.spanishPath)).toBe(getEnglishPagePath(page));
		}
		const pos = buildLandingFeatureMetadata(BASE, LANDING_FEATURES["punto-de-venta"]).alternates?.languages as Record<string, string>;
		expect(pos.en).toBe(`${BASE}/en/restaurant-pos`);
		// Una función sin versión en inglés no inventa hreflang.
		expect(buildLandingFeatureMetadata(BASE, LANDING_FEATURES.inventario).alternates?.languages).toBeUndefined();
		const home = buildEnglishHomeMetadata(BASE).alternates?.languages as Record<string, string>;
		expect(home.es).toBe(`${BASE}/estados-unidos`);
		const us = buildLandingCountryMetadata(BASE, LANDING_COUNTRIES["estados-unidos"]).alternates?.languages as Record<string, string>;
		expect(us.en).toBe(`${BASE}/en`);
	});
});

describe("/estados-unidos", () => {
	it("solo promete lo que funciona hoy para un local de EE. UU.", () => {
		const us = LANDING_COUNTRIES["estados-unidos"];
		const text = JSON.stringify(us).toLowerCase();
		expect(us.code).toBe("US");
		expect(text).toContain("zelle");
		expect(text).toContain("sales tax");
		expect(text).toContain("hoy no hay cobro con tarjeta dentro del menú");
		expect(text).not.toMatch(/stripe|apple pay|uber direct|comuna|rut\b/);
	});
});
