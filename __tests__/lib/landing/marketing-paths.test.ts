import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { LANDING_COUNTRY_SLUGS } from "@/lib/landing/countries";
import {
	LANDING_COUNTRY_SLUG_LIST,
	MAIN_DOMAIN_MARKETING_PATHS,
	isMainDomainMarketingPath,
	normalizeMarketingPath,
} from "@/lib/landing/marketing-paths";
import { MAIN_DOMAIN_RESERVED_PATH_SEGMENTS } from "@/lib/tenant/reserved-path-segments";

describe("lista única de páginas de marketing", () => {
	it("trae la home, /labs, «Sobre», la calculadora y una ruta por cada página de país", () => {
		expect(MAIN_DOMAIN_MARKETING_PATHS).toEqual(["/", "/labs", "/sobre-godcode", "/calculadora-comisiones", "/chile", "/venezuela"]);
		expect([...LANDING_COUNTRY_SLUG_LIST]).toEqual(LANDING_COUNTRY_SLUGS);
	});

	it("ninguna se confunde con el slug de una tienda", () => {
		for (const path of MAIN_DOMAIN_MARKETING_PATHS.filter((p) => p !== "/")) {
			expect(MAIN_DOMAIN_RESERVED_PATH_SEGMENTS.has(path.slice(1))).toBe(true);
		}
	});

	it("normaliza query, barra final y mayúsculas", () => {
		expect(normalizeMarketingPath("/Chile/?utm=1")).toBe("/chile");
		expect(normalizeMarketingPath("/")).toBe("/");
		expect(normalizeMarketingPath("")).toBe("/");
		expect(isMainDomainMarketingPath("/labs/")).toBe(true);
		expect(isMainDomainMarketingPath("/onboarding")).toBe(false);
		expect(isMainDomainMarketingPath("/rica-pizza")).toBe(false);
	});

	it("el rastreador de visitas no arrastra el texto de las páginas de país", () => {
		// `page-context` va en el cliente de todas las páginas, también en los menús.
		const source = readFileSync(join(process.cwd(), "lib", "analytics", "page-context.ts"), "utf8");
		expect(source).not.toContain("@/lib/landing/countries");
		expect(source).toContain("@/lib/landing/marketing-paths");
	});
});
