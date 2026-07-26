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
		expect(css).toContain("--tenant-bg-image:none");
		expect(css).toContain("--tenant-bg-layer-opacity:0");
		expect(css).not.toContain("menu-pattern");
	});

	it("uses only the tenant background image when configured", () => {
		const css = buildTenantThemeCssString({
			backgroundImageUrl: "https://supabase.ghamnas.online/storage/v1/object/public/menu/company/bg.jpg",
		});
		expect(css).toContain("--tenant-bg-layer-opacity:0.38");
		expect(css).toContain("--tenant-bg-size:1200px");
		expect(css).toContain("--tenant-bg-repeat:repeat");
		expect(css).toContain("brightness(0.46)");
		expect(css).not.toContain("menu-pattern");
	});

	it("shows natural background image colors when color opacity is 0", () => {
		const css = buildTenantThemeCssString({
			backgroundColor: "rgba(10, 10, 10, 0)",
			backgroundImageUrl: "https://supabase.ghamnas.online/storage/v1/object/public/menu/company/bg.jpg",
		});
		expect(css).toContain("--tenant-bg-layer-opacity:1");
		expect(css).toContain("--tenant-bg-size:cover");
		expect(css).toContain("--tenant-bg-repeat:no-repeat");
		expect(css).toContain("--tenant-bg-layer-filter:none");
	});

	it("preserves background color opacity as rgba", () => {
		const faded = buildTenantThemeCssString({
			backgroundColor: "rgba(10, 10, 10, 0.4)",
		});
		expect(faded).toContain("rgba(10, 10, 10, 0.4)");

		const clear = buildTenantThemeCssString({
			backgroundColor: "rgba(10, 10, 10, 0)",
		});
		expect(clear).toContain("rgba(10, 10, 10, 0)");
		expect(clear).toContain("--bg-primary:rgba(10, 10, 10, 0)");
	});
});
