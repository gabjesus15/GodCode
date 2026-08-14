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

	it("uses tenant base domain helper instead of hardcoded godcode.me", () => {
		const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
		expect(source).toContain("getTenantBaseDomain");
		expect(source).not.toMatch(/`https:\/\/\$\{c\.public_slug\}\.godcode\.me`/);
	});

	it("does not list llms.txt as an HTML sitemap URL", () => {
		const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
		expect(source).not.toContain("/llms.txt");
	});
});
