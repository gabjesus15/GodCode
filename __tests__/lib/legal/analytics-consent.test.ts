import { describe, expect, it } from "vitest";

import { parseStoredConsent, serializeConsent } from "@/lib/legal/analytics-consent";
import { ANALYTICS_CONSENT_MAX_AGE_MS } from "@/lib/legal/legal-documents";

const NOW = Date.UTC(2026, 9, 8);

describe("parseStoredConsent", () => {
	it("devuelve la elección guardada mientras está vigente", () => {
		expect(parseStoredConsent(serializeConsent("granted", NOW), NOW)).toBe("granted");
		expect(parseStoredConsent(serializeConsent("denied", NOW - 1000), NOW)).toBe("denied");
	});

	it("vuelve a preguntar cuando la elección venció", () => {
		const old = serializeConsent("granted", NOW - ANALYTICS_CONSENT_MAX_AGE_MS - 1);
		expect(parseStoredConsent(old, NOW)).toBeNull();
	});

	it("ignora valores vacíos, corruptos o con otra forma", () => {
		expect(parseStoredConsent(null, NOW)).toBeNull();
		expect(parseStoredConsent("granted", NOW)).toBeNull();
		expect(parseStoredConsent("null", NOW)).toBeNull();
		expect(parseStoredConsent(JSON.stringify({ choice: "yes", at: NOW }), NOW)).toBeNull();
		expect(parseStoredConsent(JSON.stringify({ choice: "granted" }), NOW)).toBeNull();
		expect(parseStoredConsent(serializeConsent("granted", NOW + 60_000), NOW)).toBeNull();
	});
});
