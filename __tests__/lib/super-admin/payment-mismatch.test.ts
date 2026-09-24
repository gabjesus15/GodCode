import { describe, expect, it } from "vitest";

import { detectPaymentMismatch, latestPaidByCompany } from "@/lib/super-admin/payment-mismatch";

const now = new Date("2026-09-24T12:00:00Z");
const ends = "2026-10-24T00:00:00Z";

describe("latestPaidByCompany", () => {
	it("toma el pago cobrado más nuevo e ignora los pendientes", () => {
		const map = latestPaidByCompany([
			{ company_id: "a", status: "pending_validation", payment_date: "2026-09-20" },
			{ company_id: "a", status: "paid", payment_date: "2026-09-10" },
			{ company_id: "a", status: "paid", payment_date: "2026-08-10" },
			{ company_id: "b", status: "APPROVED", payment_date: null },
		]);
		expect(map.get("a")).toBe("2026-09-10");
		expect(map.has("b")).toBe(true);
		expect(map.get("b")).toBeNull();
		expect(map.has("c")).toBe(false);
	});
});

describe("detectPaymentMismatch", () => {
	it("avisa si una activa con plan de pago nunca pagó", () => {
		expect(detectPaymentMismatch({ status: "active", planPrice: 39, endsAt: ends, lastPaidAt: undefined, now })).toEqual({
			kind: "active_without_paid",
		});
	});

	it("no avisa por planes internos o gratis", () => {
		expect(detectPaymentMismatch({ status: "active", planPrice: 0, endsAt: ends, lastPaidAt: undefined, now })).toBeNull();
		expect(detectPaymentMismatch({ status: "active", planPrice: 39, endsAt: null, lastPaidAt: undefined, now })).toBeNull();
	});

	it("no avisa si la activa ya pagó", () => {
		expect(detectPaymentMismatch({ status: "active", planPrice: 39, endsAt: ends, lastPaidAt: "2026-09-01", now })).toBeNull();
	});

	it("avisa si una suspendida pagó en los últimos 90 días", () => {
		expect(
			detectPaymentMismatch({ status: "suspended", planPrice: 39, endsAt: ends, lastPaidAt: "2026-08-01T00:00:00Z", now }),
		).toEqual({ kind: "suspended_with_recent_paid", paidAt: "2026-08-01T00:00:00Z" });
		expect(
			detectPaymentMismatch({ status: "suspended", planPrice: 39, endsAt: ends, lastPaidAt: "2026-05-01T00:00:00Z", now }),
		).toBeNull();
	});
});
