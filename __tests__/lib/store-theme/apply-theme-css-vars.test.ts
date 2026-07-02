import { describe, expect, it } from "vitest";

import { buildTenantThemeCssString } from "@/lib/store-theme/apply-theme-css-vars";

describe("apply-theme-css-vars", () => {
	it("builds css with html/body and shadow vars", () => {
		const css = buildTenantThemeCssString({
			primaryColor: "#ff0000",
			backgroundColor: "#0a0a0a",
		});
		expect(css).toContain("html, body");
		expect(css).toContain("--accent-shadow");
		expect(css).toContain("--card-border");
		expect(css).toContain("#ff0000");
	});
});
