import { describe, expect, it } from "vitest";

import {
	buildTenantLocationHint,
	buildTenantMenuDescription,
	buildTenantMenuTitle,
	buildTenantStorefrontDescription,
} from "@/lib/tenant/seo-metadata";

describe("tenant SEO metadata helpers", () => {
	it("prefers a short address over country", () => {
		expect(buildTenantLocationHint("Av. Providencia 123", "CL")).toBe("Av. Providencia 123");
	});

	it("falls back to country name when address is too long", () => {
		const long =
			"Calle muy larga con demasiados detalles de dirección que no caben en un snippet de búsqueda";
		expect(buildTenantLocationHint(long, "CL")).toBe("Chile");
	});

	it("builds menu titles under 60 chars with keyword suffix", () => {
		const title = buildTenantMenuTitle("Café Central");
		expect(title).toBe("Café Central | Menú digital");
		expect(title.length).toBeLessThanOrEqual(60);
	});

	it("includes location in menu and storefront descriptions", () => {
		expect(
			buildTenantMenuDescription({
				displayName: "Café Central",
				address: "Santiago",
				country: "CL",
			}),
		).toBe("Menú digital de Café Central en Santiago. Pide online con delivery o retiro.");

		expect(
			buildTenantStorefrontDescription({
				displayName: "Café Central",
				country: "CL",
			}),
		).toContain("en Chile");
	});
});
