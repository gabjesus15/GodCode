import { describe, expect, it } from "vitest";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import { LANDING_BUSINESS_TYPES } from "@/lib/landing/business-types";
import { LANDING_COUNTRY_SHARED_FEATURES } from "@/lib/landing/countries";
import { buildLandingFeatureJsonLd, buildLandingFeatureMetadata, getLandingFeaturePath } from "@/lib/landing/feature-page";
import { LANDING_FEATURE_SLUGS, LANDING_FEATURES } from "@/lib/landing/features";
import { MAIN_DOMAIN_MARKETING_PATHS } from "@/lib/landing/marketing-paths";
import { resolveTenantSlugFromPathname } from "@/lib/tenant/reserved-path-segments";

const BASE = "https://www.godcode.me";
const TITLE_SUFFIX = 3 + LANDING_COMPANY_NAME.length;
const features = Object.values(LANDING_FEATURES);

describe("páginas por función", () => {
	it("el proxy no las trata como tiendas", () => {
		expect(resolveTenantSlugFromPathname("/funciones")).toBeNull();
		for (const slug of LANDING_FEATURE_SLUGS) expect(resolveTenantSlugFromPathname(`/funciones/${slug}`)).toBeNull();
	});

	it("títulos que caben en Google, guía de 4, 3 pasos y al menos 3 preguntas", () => {
		for (const feature of features) {
			expect(feature.metaTitle.length + TITLE_SUFFIX).toBeLessThanOrEqual(64);
			expect(feature.metaDescription.length).toBeGreaterThanOrEqual(120);
			expect(feature.metaDescription.length).toBeLessThanOrEqual(170);
			expect(feature.guide).toHaveLength(4);
			expect(feature.steps).toHaveLength(3);
			expect(feature.faq.length).toBeGreaterThanOrEqual(3);
		}
	});

	it("sin contenido en serie: nada se repite entre funciones ni con los rubros", () => {
		const rubros = Object.values(LANDING_BUSINESS_TYPES);
		const titles = [...features.map((f) => f.metaTitle), ...rubros.map((t) => t.metaTitle)];
		expect(new Set(titles).size).toBe(titles.length);
		const guide = [...features.flatMap((f) => f.guide.map((g) => g.title)), ...rubros.flatMap((t) => t.guide.map((g) => g.title))];
		expect(new Set(guide).size).toBe(guide.length);
		const questions = [...features.flatMap((f) => f.faq.map((q) => q.question)), ...rubros.flatMap((t) => t.faq.map((q) => q.question))];
		expect(new Set(questions).size).toBe(questions.length);
	});

	it("solo promete lo que existe", () => {
		const text = JSON.stringify([LANDING_FEATURES, LANDING_BUSINESS_TYPES]).toLowerCase();
		// Los pedidos online son para retirar o delivery: no hay pedido «a la mesa» desde el QR.
		expect(text).not.toMatch(/pide(n)? desde la mesa/);
		expect(text).not.toContain("agregado");
		expect(text).not.toContain("mitad");
		// Gcode no pone repartidores.
		expect(LANDING_FEATURES["delivery-propio"].faq[0].answer).toContain("lo haces tú");
	});

	it("cada función general enlaza a su página, y esa página existe", () => {
		const linked = LANDING_COUNTRY_SHARED_FEATURES.flatMap((item) => (item.href ? [item.href] : []));
		expect(linked).toHaveLength(LANDING_FEATURE_SLUGS.length);
		for (const href of linked) expect(MAIN_DOMAIN_MARKETING_PATHS).toContain(href);
		for (const feature of features) expect(linked).toContain(getLandingFeaturePath(feature));
	});

	it("metadata y JSON-LD: canónica propia, pasos como HowTo y FAQ igual a la visible", () => {
		const feature = LANDING_FEATURES["punto-de-venta"];
		expect(buildLandingFeatureMetadata(BASE, feature).alternates?.canonical).toBe(`${BASE}/funciones/punto-de-venta`);
		const ld = buildLandingFeatureJsonLd(BASE, feature);
		const howTo = ld.find((n) => n["@type"] === "HowTo") as { step: unknown[] };
		expect(howTo.step).toHaveLength(3);
		const faq = ld.find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
		expect(faq.mainEntity.map((q) => q.name)).toEqual(feature.faq.map((q) => q.question));
	});
});
