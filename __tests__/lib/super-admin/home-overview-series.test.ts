import { describe, expect, it } from "vitest";

import { bucketEnds, countPerBucket, countSince, cumulativeAt } from "@/lib/super-admin/home-overview-series";

const DAY = 86_400_000;
const start = Date.UTC(2026, 8, 1);
const iso = (days: number) => new Date(start + days * DAY).toISOString();

describe("home overview series", () => {
	it("reparte el periodo en tramos iguales", () => {
		expect(bucketEnds(start, start + 10 * DAY, 5)).toEqual([2, 4, 6, 8, 10].map((d) => start + d * DAY));
	});

	it("cuenta eventos por tramo e ignora los de fuera", () => {
		const ends = bucketEnds(start, start + 10 * DAY, 5);
		expect(countPerBucket([iso(1), iso(1.5), iso(9), iso(-3), iso(20), null], start, ends)).toEqual([2, 0, 0, 0, 1]);
	});

	it("acumula incluyendo lo anterior al periodo", () => {
		const ends = bucketEnds(start, start + 4 * DAY, 2);
		expect(cumulativeAt([iso(-30), iso(1), iso(3)], ends)).toEqual([2, 3]);
	});

	it("cuenta desde una fecha o todo si no hay inicio", () => {
		expect(countSince([iso(1), iso(5), "no-es-fecha"], start + 2 * DAY)).toBe(1);
		expect(countSince([iso(1), iso(5)], null)).toBe(2);
	});
});
