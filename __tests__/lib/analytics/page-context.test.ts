import { beforeEach, describe, expect, it } from "vitest";

import { isInternalAnalyticsPath, isLocalAnalyticsHost, resolveAnalyticsPageContext } from "@/lib/analytics/page-context";

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

describe("isInternalAnalyticsPath", () => {
	it("excluye los paneles internos", () => {
		for (const path of ["/dashboard", "/companies/123", "/cuenta", "/landing", "/login", "/onboarding/solicitudes"]) {
			expect(isInternalAnalyticsPath(path)).toBe(true);
		}
	});

	it("deja pasar landing, onboarding público y menús", () => {
		for (const path of ["/", "/onboarding", "/onboarding/pago", "/sobre-godcode", "/la-parada/menu", "/menu"]) {
			expect(isInternalAnalyticsPath(path)).toBe(false);
		}
	});
});

describe("isLocalAnalyticsHost", () => {
	it("reconoce hosts locales", () => {
		expect(isLocalAnalyticsHost("localhost:3000")).toBe(true);
		expect(isLocalAnalyticsHost("127.0.0.1")).toBe(true);
		expect(isLocalAnalyticsHost("oishi.localhost")).toBe(true);
		expect(isLocalAnalyticsHost("oishisushi.shop")).toBe(false);
	});
});
