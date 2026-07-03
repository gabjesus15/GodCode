import { describe, expect, it } from "vitest";

import {
	isLowEndDeviceFromSignals,
	scoreDevicePerformance,
} from "@/lib/tenant/device/low-end-device";

describe("low-end-device", () => {
	it("marca Samsung A50 típico (4 GB, 8 núcleos) como gama baja", () => {
		expect(
			isLowEndDeviceFromSignals({
				hardwareConcurrency: 8,
				deviceMemoryGb: 4,
				isMobileViewport: true,
			}),
		).toBe(true);
	});

	it("no marca flagship con 8 GB como gama baja", () => {
		expect(
			isLowEndDeviceFromSignals({
				hardwareConcurrency: 8,
				deviceMemoryGb: 8,
				isMobileViewport: true,
			}),
		).toBe(false);
	});

	it("penaliza save-data y 3G", () => {
		const baseline = scoreDevicePerformance({ hardwareConcurrency: 8, deviceMemoryGb: 6 });
		const constrained = scoreDevicePerformance({
			hardwareConcurrency: 8,
			deviceMemoryGb: 6,
			saveData: true,
			effectiveConnectionType: "3g",
		});
		expect(constrained).toBeLessThan(baseline);
	});
});
