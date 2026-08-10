import { describe, expect, it } from "vitest";

import { buildPoweredByHref } from "@/lib/tenant/powered-by";

describe("buildPoweredByHref", () => {
	it("adds utm params with tenant campaign", () => {
		const href = buildPoweredByHref({ tenantSlug: "oishisushi", surface: "menu" });
		const url = new URL(href);
		expect(url.searchParams.get("utm_source")).toBe("tenant_powered_by");
		expect(url.searchParams.get("utm_medium")).toBe("menu");
		expect(url.searchParams.get("utm_campaign")).toBe("oishisushi");
	});
});
