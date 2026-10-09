import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import { LANDING_COUNTRIES, LANDING_COUNTRY_SLUGS, getLandingCountry } from "@/lib/landing/countries";
import { buildLandingCountryJsonLd, buildLandingCountryMetadata } from "@/lib/landing/country-page";
import { LEGAL_MERCADO_PAGO_CLP, LEGAL_OTHER_CURRENCY, LEGAL_PRICES_IN_USD } from "@/lib/legal/legal-documents";
import { INTERNAL_TEST_TENANT_SLUGS, isInternalTestTenantSlug } from "@/lib/seo/internal-test-tenant";
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

	it("Venezuela habla de bolívares, pago móvil y tasa BCV; Chile de Mercado Pago, con el precio en dólares", () => {
		const ve = JSON.stringify(LANDING_COUNTRIES.venezuela).toLowerCase();
		expect(ve).toContain("bolívares");
		expect(ve).toContain("pago móvil");
		expect(ve).toContain("tasa bcv");
		expect(ve).toContain("zelle");
		const chile = LANDING_COUNTRIES.chile;
		const cl = JSON.stringify(chile).toLowerCase();
		expect(cl).toContain("dólares");
		expect(cl).toContain("mercado pago");
		expect(cl).toContain("santiago");
		expect(cl).not.toContain(" clp");
		// El plan está en USD (CL resuelve a «Latinoamérica» en country-registry). Los pesos solo
		// aparecen en la frase de Mercado Pago, que es la misma de los Términos: nunca como precio.
		expect(chile.currencyNote).toBe(`${LEGAL_PRICES_IN_USD} ${LEGAL_MERCADO_PAGO_CLP} ${LEGAL_OTHER_CURRENCY}`);
		const pesoMentions = cl.split("pesos chilenos").length - 1;
		const mercadoPagoSentences = cl.split(LEGAL_MERCADO_PAGO_CLP.toLowerCase()).length - 1;
		expect(pesoMentions).toBeGreaterThan(0);
		expect(pesoMentions).toBe(mercadoPagoSentences);
		// Sin cifras de venta inventadas: el ahorro se calcula con la calculadora, no con un ejemplo sin fuente.
		expect(cl).not.toMatch(/\$ ?\d/);
		expect(cl).toContain("entre un 20 y un 30 % en comisiones; calcúlalo con tu propia venta");
	});

	it("los Términos dicen lo mismo que /chile sobre la moneda", () => {
		const terms = readFileSync(join(process.cwd(), "app", "onboarding", "terminos", "page.tsx"), "utf8");
		for (const constant of ["LEGAL_PRICES_IN_USD", "LEGAL_MERCADO_PAGO_CLP", "LEGAL_OTHER_CURRENCY"]) {
			expect(terms).toContain(`{${constant}}`);
		}
		// Nada de precios «en la moneda de tu país»: el texto de moneda sale solo de las constantes.
		expect(terms).not.toContain("pesos chilenos");
		expect(terms).not.toContain("moneda que corresponde a tu país");
	});

	it("metadata: canónica propia, locale del país y sin hreflang inventado", () => {
		const meta = buildLandingCountryMetadata(BASE, LANDING_COUNTRIES.chile);
		expect(meta.alternates?.canonical).toBe(`${BASE}/chile`);
		expect(meta.alternates?.languages).toBeUndefined();
		expect(meta.openGraph?.locale).toBe("es_CL");
		expect(buildLandingCountryMetadata(BASE, LANDING_COUNTRIES.venezuela).openGraph?.locale).toBe("es_VE");
		expect(meta.robots).toMatchObject({ index: true, follow: true });
	});

	it("JSON-LD: Service con areaServed del país, miga de pan, FAQ igual al texto visible y la Organization referenciada", () => {
		const country = LANDING_COUNTRIES.venezuela;
		const ld = buildLandingCountryJsonLd(BASE, country);
		const types = ld.map((n) => n["@type"]);
		expect(types).toEqual(["WebPage", "Service", "BreadcrumbList", "FAQPage", "Organization"]);

		// `publisher` y `provider` apuntan a #organization: el nodo tiene que ir en la misma página.
		const organization = ld[4] as { "@id": string; name: string };
		expect(organization["@id"]).toBe(`${BASE}/#organization`);
		expect(organization.name).toBe(LANDING_COMPANY_NAME);
		const webPage = ld[0] as { publisher: { "@id": string } };
		expect(webPage.publisher["@id"]).toBe(organization["@id"]);

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
		// La regla de tiendas de prueba vive ahora en isPubliclyListedCompany (junto con «solo panel»).
		expect(sitemap).toContain("isPubliclyListedCompany");
		const footer = readFileSync(join(process.cwd(), "components", "landing-v3", "footer.tsx"), "utf8");
		expect(footer).toContain('href: "/chile"');
		expect(footer).toContain('href: "/venezuela"');
	});
});

describe("tiendas de prueba fuera del sitemap", () => {
	it("el marcador va al inicio del slug o el slug está en la lista fija", () => {
		for (const slug of ["demo", "demo-pizzeria", "qa-cafe", "test-sushi", "prueba", "pruebas-2", "staging-rica", "QA-Cafe"]) {
			expect(isInternalTestTenantSlug(slug)).toBe(true);
		}
		expect(INTERNAL_TEST_TENANT_SLUGS.has("pizzeria-demo-qa")).toBe(true);
		expect(isInternalTestTenantSlug("pizzeria-demo-qa")).toBe(true);
	});

	it("respeta los nombres reales aunque lleven la palabra dentro o al final", () => {
		for (const slug of ["rica-pizza", "la-parada", "la-prueba", "sushi-demo", "democrata-cafe", "contest-bar", "testarossa"]) {
			expect(isInternalTestTenantSlug(slug)).toBe(false);
		}
	});
});
