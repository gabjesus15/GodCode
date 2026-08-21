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
		expect(source).toContain('DEFAULT_SITEMAP_LAST_MODIFIED = "2026-08-14T00:00:00.000Z"');
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
