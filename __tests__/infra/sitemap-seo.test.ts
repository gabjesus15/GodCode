import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("sitemap.ts SEO rules", () => {
	it("does not list fake landing hreflang URLs", () => {
		const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
		expect(source).not.toContain("localizedLandingUrls");
		expect(source).not.toContain("localizedAboutUrls");
		expect(source).not.toContain("/?hl=");
		expect(source).not.toContain("?hl=");
	});

	it("uses a fresh marketing lastModified default (post July 2026 crawl)", () => {
		const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
		const match = source.match(/DEFAULT_SITEMAP_LAST_MODIFIED = "(\d{4}-\d{2}-\d{2})T00:00:00\.000Z"/);
		expect(match).not.toBeNull();
		// Basta con que sea posterior al último rastreo de julio de 2026: la fecha
		// se sube en cada despliegue de marketing y no puede fijarse aquí.
		expect(new Date(`${match?.[1]}T00:00:00.000Z`).getTime()).toBeGreaterThan(Date.UTC(2026, 6, 31));
	});

	it("lists tenants with path-based URLs on the main domain (no subdomains)", () => {
		const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
		expect(source).toContain("`${base}/${c.public_slug}`");
		expect(source).not.toContain("getTenantOrigin");
		expect(source).not.toMatch(/`https:\/\/\$\{[^}]+\}\.\$\{/);
	});

	it("does not list llms.txt as an HTML sitemap URL", () => {
		const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
		expect(source).not.toContain("/llms.txt");
	});
});
