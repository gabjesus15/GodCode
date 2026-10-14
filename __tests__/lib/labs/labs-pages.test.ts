import { describe, expect, it } from "vitest";

import { LANDING_COMPANY_NAME } from "@/lib/landing/brand";
import { LABS_SUBPAGE_PATHS } from "@/lib/landing/marketing-paths";
import { LABS_PROJECTS, LABS_SERVICES } from "@/lib/labs/content";
import {
	LABS_COST_GUIDE,
	LABS_COST_GUIDE_PATH,
	LABS_PROJECT_PAGES,
	LABS_SERVICE_PAGES,
	labsProjectPageFor,
	labsProjectPath,
	labsServicePath,
} from "@/lib/labs/pages";
import { buildLabsServiceJsonLd, buildLabsServiceMetadata } from "@/lib/labs/pages-seo";

const BASE = "https://www.godcode.me";
const TITLE_SUFFIX = 3 + LANDING_COMPANY_NAME.length;

describe("páginas de Gcode Labs", () => {
	it("una página por cada servicio y cada proyecto con caso; la lista de rutas coincide", () => {
		expect(LABS_SERVICE_PAGES.map((p) => p.id).sort()).toEqual(LABS_SERVICES.map((s) => s.id).sort());
		for (const page of LABS_PROJECT_PAGES) expect(LABS_PROJECTS.map((p) => p.name)).toContain(page.name);
		const expected = [
			...LABS_SERVICE_PAGES.map((p) => labsServicePath(p.id)),
			...LABS_PROJECT_PAGES.map((p) => labsProjectPath(p.slug)),
			LABS_COST_GUIDE_PATH,
		];
		expect([...LABS_SUBPAGE_PATHS]).toEqual(expected);
	});

	it("títulos que caben en Google y descripciones de largo útil", () => {
		for (const page of [...LABS_SERVICE_PAGES, ...LABS_PROJECT_PAGES, LABS_COST_GUIDE]) {
			expect(page.metaTitle.length + TITLE_SUFFIX).toBeLessThanOrEqual(64);
			expect(page.metaDescription.length).toBeGreaterThanOrEqual(120);
			expect(page.metaDescription.length).toBeLessThanOrEqual(170);
		}
	});

	it("sin precios ni cifras inventadas", () => {
		const text = JSON.stringify([LABS_SERVICE_PAGES, LABS_PROJECT_PAGES, LABS_COST_GUIDE]);
		expect(text).not.toMatch(/US\$|\$\s?\d|CLP|\d+\s?%/);
		expect(text).not.toMatch(/premio|24\/7|líder|el mejor/i);
	});

	it("Auto Care Planet cuenta el ahorro de tiempo en agendar y cotizar, sin números", () => {
		const acp = LABS_PROJECT_PAGES.find((p) => p.slug === "auto-care-planet")!;
		expect(acp.result).toContain("Agendar y cotizar");
		expect(acp.result).not.toMatch(/\d/);
	});

	it("Gcode POS no tiene página de caso: su tarjeta sigue llevando al producto", () => {
		const pos = LABS_PROJECTS.find((p) => p.ownProduct)!;
		expect(labsProjectPageFor(pos)).toBeUndefined();
	});

	it("metadata y JSON-LD de un servicio: canónica, Service con su proveedor y FAQ visible", () => {
		const page = LABS_SERVICE_PAGES[0]!;
		const service = LABS_SERVICES.find((s) => s.id === page.id)!;
		expect(buildLabsServiceMetadata(BASE, page).alternates?.canonical).toBe(`${BASE}/labs/servicios/${page.id}`);
		const ld = buildLabsServiceJsonLd(BASE, page, service);
		expect(ld.find((n) => n["@type"] === "Service")).toBeTruthy();
		const faq = ld.find((n) => n["@type"] === "FAQPage") as { mainEntity: { name: string }[] };
		expect(faq.mainEntity.map((q) => q.name)).toEqual(page.faq.map((q) => q.question));
	});
});
