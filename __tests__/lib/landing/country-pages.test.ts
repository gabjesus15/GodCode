import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import { LANDING_COUNTRIES, LANDING_COUNTRY_SLUGS, getLandingCountry } from "@/lib/landing/countries";
import { buildLandingCountryJsonLd, buildLandingCountryMetadata } from "@/lib/landing/country-page";
import { isInternalTestTenantSlug } from "@/lib/seo/internal-test-tenant";
import { MAIN_DOMAIN_RESERVED_PATH_SEGMENTS, resolveTenantSlugFromPathname } from "@/lib/tenant/reserved-path-segments";

const BASE = "https://www.godcode.me";

describe("páginas de país del landing", () => {
	it("existen Chile y Venezuela y el proxy no las trata como tenants", () => {
		expect(LANDING_COUNTRY_SLUGS).toEqual(["chile", "venezuela"]);
		for (const slug of LANDING_COUNTRY_SLUGS) {
			expect(MAIN_DOMAIN_RESERVED_PATH_SEGMENTS.has(slug)).toBe(true);
			expect(resolveTenantSlugFromPathname(`/${slug}`)).toBeNull();
		}
		expect(getLandingCountry("peru")).toBeNull();
	});

	it("cada país tiene su título corto, su descripción y sus propias preguntas", () => {
		for (const slug of LANDING_COUNTRY_SLUGS) {
			const country = LANDING_COUNTRIES[slug];
			expect(country.metaTitle).toContain(country.name);
			expect(country.metaTitle).toContain("restaurantes");
			// La plantilla raíz añade " · Gcode Labs"; el total debe caber en Google (~60).
			expect(country.metaTitle.length + 3 + LANDING_COMPANY_NAME.length).toBeLessThanOrEqual(64);
			expect(country.metaDescription.length).toBeGreaterThanOrEqual(120);
			expect(country.metaDescription.length).toBeLessThanOrEqual(170);
			expect(country.faq.length).toBeGreaterThanOrEqual(4);
			expect(country.localFeatures.length).toBe(4);
		}
		// Sin contenido duplicado entre países: ninguna pregunta ni bloque local se repite.
		const chileQuestions = new Set(LANDING_COUNTRIES.chile.faq.map((f) => f.question));
		for (const f of LANDING_COUNTRIES.venezuela.faq) expect(chileQuestions.has(f.question)).toBe(false);
	});

	it("Venezuela habla de bolívares, pago móvil y tasa BCV; Chile de Mercado Pago y no promete pesos", () => {
		const ve = JSON.stringify(LANDING_COUNTRIES.venezuela).toLowerCase();
		expect(ve).toContain("bolívares");
		expect(ve).toContain("pago móvil");
		expect(ve).toContain("tasa bcv");
		expect(ve).toContain("zelle");
		const cl = JSON.stringify(LANDING_COUNTRIES.chile).toLowerCase();
		// La suscripción se cobra en USD (CL resuelve a «Latinoamérica» en country-registry):
		// prometer pesos al lado de «Desde $19 USD/mes» sería publicidad engañosa.
		expect(cl).not.toContain("pesos chilenos");
		expect(cl).not.toContain(" clp");
		expect(cl).toContain("dólares");
		expect(cl).toContain("mercado pago");
		expect(cl).toContain("santiago");
	});

	it("metadata: canónica propia, locale del país y sin hreflang inventado", () => {
		const meta = buildLandingCountryMetadata(BASE, LANDING_COUNTRIES.chile);
		expect(meta.alternates?.canonical).toBe(`${BASE}/chile`);
		expect(meta.alternates?.languages).toBeUndefined();
		expect(meta.openGraph?.locale).toBe("es_CL");
		expect(buildLandingCountryMetadata(BASE, LANDING_COUNTRIES.venezuela).openGraph?.locale).toBe("es_VE");
		expect(meta.robots).toMatchObject({ index: true, follow: true });
	});

	it("JSON-LD: Service con areaServed del país, miga de pan y FAQ igual al texto visible", () => {
		const country = LANDING_COUNTRIES.venezuela;
		const ld = buildLandingCountryJsonLd(BASE, country);
		const types = ld.map((n) => n["@type"]);
		expect(types).toEqual(["WebPage", "Service", "BreadcrumbList", "FAQPage"]);

		const service = ld[1] as { areaServed: { "@type": string; name: string }[]; provider: { "@id": string } };
		expect(service.areaServed[0]).toMatchObject({ "@type": "Country", name: "Venezuela", identifier: "VE" });
		expect(service.areaServed.some((a) => a["@type"] === "City" && a.name === "Caracas")).toBe(true);
		expect(service.provider).toEqual({ "@id": `${BASE}/#organization` });

		const faq = ld[3] as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
		expect(faq.mainEntity.map((q) => q.name)).toEqual(country.faq.map((f) => f.question));
		expect(faq.mainEntity.map((q) => q.acceptedAnswer.text)).toEqual(country.faq.map((f) => f.answer));
	});

	it("sitemap y pie de página enlazan las dos páginas", () => {
		const sitemap = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
		expect(sitemap).toContain("LANDING_COUNTRY_SLUGS");
		expect(sitemap).toContain("isInternalTestTenantSlug");
		const footer = readFileSync(join(process.cwd(), "components", "landing-v3", "footer.tsx"), "utf8");
		expect(footer).toContain('href: "/chile"');
		expect(footer).toContain('href: "/venezuela"');
	});
});

describe("tiendas de prueba fuera del sitemap", () => {
	it("detecta slugs de demo/QA y respeta los nombres reales", () => {
		expect(isInternalTestTenantSlug("pizzeria-demo-qa")).toBe(true);
		expect(isInternalTestTenantSlug("demo")).toBe(true);
		expect(isInternalTestTenantSlug("test-sushi")).toBe(true);
		expect(isInternalTestTenantSlug("rica-pizza")).toBe(false);
		expect(isInternalTestTenantSlug("la-parada")).toBe(false);
		// «demo» dentro de una palabra no cuenta (p. ej. un local llamado Demócrata).
		expect(isInternalTestTenantSlug("democrata-cafe")).toBe(false);
		expect(isInternalTestTenantSlug("contest-bar")).toBe(false);
	});
});
