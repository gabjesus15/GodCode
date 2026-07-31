import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("sitemap.ts SEO rules", () => {
	it("does not list fake landing hreflang URLs", () => {
		const source = readFileSync(join(process.cwd(), "app", "sitemap.ts"), "utf8");
		expect(source).not.toContain("localizedLandingUrls");
		expect(source).not.toContain("/?hl=");
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
