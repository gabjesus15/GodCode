import { beforeEach, describe, expect, it } from "vitest";

import { resolveAnalyticsPageContext } from "@/lib/analytics/page-context";

describe("resolveAnalyticsPageContext", () => {
	beforeEach(() => {
		process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN = "godcode.me";
	});

	it("clasifica la landing en el dominio principal", () => {
		expect(
			resolveAnalyticsPageContext({ pathname: "/", host: "godcode.me" }),
		).toEqual({ pageType: "landing", tenantSlug: null });
	});

	it("clasifica menús por path en el dominio principal", () => {
		expect(
			resolveAnalyticsPageContext({ pathname: "/la-parada/menu", host: "www.godcode.me" }),
		).toEqual({ pageType: "tenant", tenantSlug: "la-parada" });
	});

	it("clasifica el panel como saas", () => {
		expect(
			resolveAnalyticsPageContext({ pathname: "/dashboard", host: "godcode.me" }),
		).toEqual({ pageType: "saas", tenantSlug: null });
	});

	it("clasifica subdominios de tenant", () => {
		expect(
			resolveAnalyticsPageContext({ pathname: "/menu", host: "la-parada.godcode.me" }),
		).toEqual({ pageType: "tenant", tenantSlug: "la-parada" });
	});
});
