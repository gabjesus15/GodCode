import { describe, expect, it } from "vitest";

import {
	resolveActiveSectionIdFromDom,
	resolveActiveSectionIndexFromMeasurements,
} from "@/lib/tenant/menu/menu-scroll-spy";

describe("menu-scroll-spy", () => {
	it("resolveActiveSectionIndexFromMeasurements picks the last section before the reading line", () => {
		const measurements = [
			{ start: 116 },
			{ start: 900 },
			{ start: 1800 },
		];
		expect(resolveActiveSectionIndexFromMeasurements(measurements, 500)).toBe(0);
		expect(resolveActiveSectionIndexFromMeasurements(measurements, 1200)).toBe(1);
		expect(resolveActiveSectionIndexFromMeasurements(measurements, 2000)).toBe(2);
	});

	it("resolveActiveSectionIdFromDom returns null without a document", () => {
		expect(resolveActiveSectionIdFromDom(116)).toBeNull();
	});
});
