import { describe, expect, it } from "vitest";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import {
	buildLandingBusinessTypeJsonLd,
	buildLandingBusinessTypeMetadata,
	buildLandingBusinessTypesIndexJsonLd,
	getBusinessTypeSampleMenu,
} from "@/lib/landing/business-type-page";
import { LANDING_BUSINESS_TYPE_SLUGS, LANDING_BUSINESS_TYPES } from "@/lib/landing/business-types";
import {
	commissionOn100k,
	COMMISSIONS_BY_APP,
	COMMISSIONS_GUIDE_FAQ,
	COMMISSIONS_GUIDE_SOURCES,
	COMMISSIONS_GUIDE_TITLE,
	formatClp,
	formatGuideDate,
} from "@/lib/landing/commissions-guide";
import { BUSINESS_SECTORS } from "@/lib/onboarding/business-sectors";
import { resolveTenantSlugFromPathname } from "@/lib/tenant/reserved-path-segments";

const BASE = "https://www.godcode.me";
const TITLE_SUFFIX = 3 + LANDING_COMPANY_NAME.length; // « · Gcode Labs» de la plantilla raíz

describe("páginas por tipo de negocio", () => {
	it("cada rubro existe en el alta y el proxy no lo trata como tienda", () => {
		for (const slug of LANDING_BUSINESS_TYPE_SLUGS) {
			const type = LANDING_BUSINESS_TYPES[slug];
			expect(BUSINESS_SECTORS).toContain(type.sector);
			expect(resolveTenantSlugFromPathname(`/menu-digital/${slug}`)).toBeNull();
		}
		expect(resolveTenantSlugFromPathname("/menu-digital")).toBeNull();
	});

	it("títulos que caben en Google y descripciones de largo útil", () => {
		for (const type of Object.values(LANDING_BUSINESS_TYPES)) {
			expect(type.metaTitle.length + TITLE_SUFFIX).toBeLessThanOrEqual(64);
			expect(type.metaDescription.length).toBeGreaterThanOrEqual(120);
			expect(type.metaDescription.length).toBeLessThanOrEqual(170);
			expect(type.guide.length).toBe(4);
			expect(type.faq.length).toBeGreaterThanOrEqual(3);
		}
	});

	it("sin contenido en serie: ninguna guía, pregunta o título se repite entre rubros", () => {
		const all = Object.values(LANDING_BUSINESS_TYPES);
		for (const field of ["metaTitle", "metaDescription", "heroSubtitle", "teaser"] as const) {
			expect(new Set(all.map((t) => t[field])).size).toBe(all.length);
		}
		const guideTitles = all.flatMap((t) => t.guide.map((g) => g.title));
		expect(new Set(guideTitles).size).toBe(guideTitles.length);
		const questions = all.flatMap((t) => t.faq.map((f) => f.question));
		expect(new Set(questions).size).toBe(questions.length);
	});

	it("solo promete lo que existe: variantes de una opción, no agregados múltiples", () => {
		const text = JSON.stringify(LANDING_BUSINESS_TYPES).toLowerCase();
		expect(text).not.toContain("agregado");
		expect(text).not.toContain("mitad");
		expect(text).not.toContain("propina");
	});

	it("el menú de ejemplo es el del alta para ese rubro, sin el prefijo «Ejemplo:»", () => {
		const pizza = getBusinessTypeSampleMenu(LANDING_BUSINESS_TYPES.pizzerias);
		expect(pizza.map((c) => c.name)).toContain("Pizzas");
		const sushi = getBusinessTypeSampleMenu(LANDING_BUSINESS_TYPES.sushi);
		expect(sushi.map((c) => c.name)).toContain("Rolls");
		for (const product of pizza.flatMap((c) => c.products)) expect(product.description).not.toMatch(/^Ejemplo/i);
	});

	it("metadata con canónica propia y JSON-LD con miga de pan de tres niveles y FAQ visible", () => {
		const type = LANDING_BUSINESS_TYPES.cafeterias;
		expect(buildLandingBusinessTypeMetadata(BASE, type).alternates?.canonical).toBe(`${BASE}/menu-digital/cafeterias`);
		const ld = buildLandingBusinessTypeJsonLd(BASE, type);
		const crumbs = ld.find((n) => n["@type"] === "BreadcrumbList") as { itemListElement: unknown[] };
		expect(crumbs.itemListElement).toHaveLength(3);
		const faq = ld.find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
		expect(faq.mainEntity.map((q) => q.name)).toEqual(type.faq.map((f) => f.question));
		const index = buildLandingBusinessTypesIndexJsonLd(BASE)[0] as { mainEntity: { itemListElement: unknown[] } };
		expect(index.mainEntity.itemListElement).toHaveLength(LANDING_BUSINESS_TYPE_SLUGS.length);
	});
});

describe("guía de comisiones en Chile", () => {
	it("el título cabe en Google", () => {
		expect(COMMISSIONS_GUIDE_TITLE.length + TITLE_SUFFIX).toBeLessThanOrEqual(64);
	});

	it("cada dato de la tabla tiene su fuente oficial", () => {
		for (const row of COMMISSIONS_BY_APP) {
			expect(COMMISSIONS_GUIDE_SOURCES[row.source].url).toMatch(/^https:\/\//);
		}
		// Uber Eats es la única que publica cifras; las otras dos no deben inventarse.
		const uber = COMMISSIONS_BY_APP.find((r) => r.app === "Uber Eats");
		expect(uber?.detail).toContain("25 %");
		expect(uber?.detail).toContain("29 %");
		for (const app of ["PedidosYa", "Rappi"]) {
			expect(COMMISSIONS_BY_APP.find((r) => r.app === app)?.published).not.toMatch(/\d/);
		}
		for (const source of Object.values(COMMISSIONS_GUIDE_SOURCES)) {
			expect(source.url).toMatch(/ubereats\.com|pedidosya\.cl|rappi\.com|fne\.gob\.cl/);
		}
	});

	it("el ejemplo de $100.000 es aritmética: comisión + 19 % de IVA sobre la comisión", () => {
		expect(commissionOn100k(29)).toEqual({ commission: 29_000, vat: 5_510, total: 34_510, remaining: 65_490 });
		expect(commissionOn100k(25).total).toBe(29_750);
		expect(formatClp(34_510)).toBe("$34.510");
	});

	it("fecha legible y preguntas sin repetir", () => {
		expect(formatGuideDate("2026-10-13")).toBe("13 de octubre de 2026");
		expect(new Set(COMMISSIONS_GUIDE_FAQ.map((f) => f.question)).size).toBe(COMMISSIONS_GUIDE_FAQ.length);
	});
});
