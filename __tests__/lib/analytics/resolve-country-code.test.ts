import { describe, expect, it } from "vitest";

import { resolveAnalyticsCountryCode } from "@/lib/analytics/resolve-country-code";

describe("resolveAnalyticsCountryCode", () => {
	it("usa la cabecera del CDN si viene", async () => {
		expect(await resolveAnalyticsCountryCode(new Headers({ "cf-ipcountry": "ve" }), "8.8.8.8")).toBe("VE");
	});

	it("sin cabecera, busca la IP en la base local", async () => {
		expect(await resolveAnalyticsCountryCode(new Headers(), "8.8.8.8")).toBe("US");
		expect(await resolveAnalyticsCountryCode(new Headers(), "200.29.0.1")).toBe("CL");
	});

	it("no resuelve IPs privadas ni vacías", async () => {
		expect(await resolveAnalyticsCountryCode(new Headers(), "192.168.1.10")).toBeNull();
		expect(await resolveAnalyticsCountryCode(new Headers(), null)).toBeNull();
	});
});
