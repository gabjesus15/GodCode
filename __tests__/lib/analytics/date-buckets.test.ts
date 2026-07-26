import { describe, expect, it } from "vitest";

import { eachUtcDayKeys, utcDateKey } from "@/lib/analytics/date-buckets";

describe("date-buckets", () => {
	it("extracts YYYY-MM-DD from ISO timestamps", () => {
		expect(utcDateKey("2026-07-26T11:18:22.074047+00:00")).toBe("2026-07-26");
		expect(utcDateKey("2026-07-26 11:18:22.074047+00")).toBe("2026-07-26");
	});

	it("builds inclusive UTC day ranges without local timezone drift", () => {
		const days = eachUtcDayKeys("2026-07-01T00:00:00.000Z", "2026-07-03T12:00:00.000Z");
		expect(days).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
	});
});
