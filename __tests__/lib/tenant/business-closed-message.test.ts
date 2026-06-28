import { describe, expect, it } from "vitest";

import {
	buildBusinessClosedCustomerMessage,
	parseScheduleRules,
	resolveNextOpeningLabel,
} from "@/lib/tenant/business-closed-message";

describe("business-closed-message", () => {
	it("parses a simple day range schedule", () => {
		const rules = parseScheduleRules("Lun - Dom: 10:00 - 22:00");
		expect(rules).toHaveLength(1);
		expect(rules[0]?.days).toEqual([1, 2, 3, 4, 5, 6, 0]);
		expect(rules[0]?.openMinutes).toBe(10 * 60);
	});

	it("builds a customer-facing closed message with schedule fallback", () => {
		const message = buildBusinessClosedCustomerMessage({
			businessName: "Oishi Sushi",
			schedule: "Lun - Dom: 10:00 - 22:00",
		});
		expect(message).toContain("Oishi Sushi está cerrado");
		expect(message).toMatch(/Vuelve a abrir|Horario de atención/);
	});

	it("resolves next opening for a monday morning before open", () => {
		const mondayBeforeOpen = new Date("2026-06-29T08:00:00-04:00");
		const label = resolveNextOpeningLabel({
			schedule: "Lun - Vie: 10:00 - 22:00",
			now: mondayBeforeOpen,
			timeZone: "America/Santiago",
			locale: "es-CL",
		});
		expect(label).toMatch(/hoy a las/i);
	});
});
