import { describe, expect, it } from "vitest";

import { parseSubscriptionCouponPayload, resolveCouponStatus } from "@/lib/billing/subscription-coupon-admin";

describe("parseSubscriptionCouponPayload (crear)", () => {
	it("normaliza el código y rellena los opcionales", () => {
		const parsed = parseSubscriptionCouponPayload({ code: " lanzamiento 20 ", kind: "percent", value: "20" }, { partial: false });
		expect(parsed).toEqual({
			ok: true,
			data: {
				code: "LANZAMIENTO20",
				kind: "percent",
				value: 20,
				description: null,
				min_months: 1,
				plan_ids: null,
				keeps_promo: true,
				max_redemptions: null,
				valid_from: null,
				valid_until: null,
				is_active: true,
			},
		});
	});

	it("exige código, tipo y valor válidos", () => {
		expect(parseSubscriptionCouponPayload({ code: "AB", kind: "percent", value: 10 }, { partial: false })).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "regalo", value: 10 }, { partial: false })).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 0 }, { partial: false })).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 101 }, { partial: false })).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "free_months", value: 1.5 }, { partial: false })).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "free_months", value: 13 }, { partial: false })).toMatchObject({ ok: false });
	});

	it("redondea el monto fijo a centavos y trunca los meses", () => {
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "fixed", value: 5.555 }, { partial: false })).toMatchObject({ ok: true, data: { value: 5.56 } });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "free_months", value: "2" }, { partial: false })).toMatchObject({ ok: true, data: { value: 2 } });
	});

	it("valida planes, límites y fechas", () => {
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 10, plan_ids: ["no-es-uuid"] }, { partial: false })).toMatchObject({ ok: false });
		expect(
			parseSubscriptionCouponPayload(
				{ code: "ABCD", kind: "percent", value: 10, plan_ids: ["11111111-1111-1111-1111-111111111111", "11111111-1111-1111-1111-111111111111"] },
				{ partial: false },
			),
		).toMatchObject({ ok: true, data: { plan_ids: ["11111111-1111-1111-1111-111111111111"] } });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 10, plan_ids: [] }, { partial: false })).toMatchObject({ ok: true, data: { plan_ids: null } });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 10, max_redemptions: 0 }, { partial: false })).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 10, max_redemptions: "" }, { partial: false })).toMatchObject({ ok: true, data: { max_redemptions: null } });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 10, valid_from: "no" }, { partial: false })).toMatchObject({ ok: false });
		expect(
			parseSubscriptionCouponPayload(
				{ code: "ABCD", kind: "percent", value: 10, valid_from: "2026-10-10T00:00:00Z", valid_until: "2026-10-01T00:00:00Z" },
				{ partial: false },
			),
		).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 10, min_months: 13 }, { partial: false })).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ code: "ABCD", kind: "percent", value: 10, description: "x".repeat(201) }, { partial: false })).toMatchObject({ ok: false });
	});
});

describe("parseSubscriptionCouponPayload (editar)", () => {
	it("solo toca lo que viene", () => {
		expect(parseSubscriptionCouponPayload({ is_active: false }, { partial: true })).toEqual({ ok: true, data: { is_active: false } });
		expect(parseSubscriptionCouponPayload({}, { partial: true })).toMatchObject({ ok: false });
	});

	it("valida el valor contra el tipo guardado cuando solo cambia el valor", () => {
		expect(parseSubscriptionCouponPayload({ value: 150, current_kind: "percent" }, { partial: true })).toMatchObject({ ok: false });
		expect(parseSubscriptionCouponPayload({ value: 150, current_kind: "fixed" }, { partial: true })).toMatchObject({ ok: true, data: { value: 150 } });
	});
});

describe("resolveCouponStatus", () => {
	const now = new Date("2026-10-06T12:00:00Z");
	const base = { is_active: true, valid_from: null, valid_until: null, max_redemptions: null, redemptions_count: 0 };

	it("prioriza inactivo, luego agotado, vencido y programado", () => {
		expect(resolveCouponStatus({ ...base, is_active: false, max_redemptions: 1, redemptions_count: 1 }, now)).toBe("inactive");
		expect(resolveCouponStatus({ ...base, max_redemptions: 1, redemptions_count: 1, valid_until: "2026-01-01T00:00:00Z" }, now)).toBe("exhausted");
		expect(resolveCouponStatus({ ...base, valid_until: "2026-01-01T00:00:00Z" }, now)).toBe("expired");
		expect(resolveCouponStatus({ ...base, valid_from: "2026-12-01T00:00:00Z" }, now)).toBe("scheduled");
		expect(resolveCouponStatus(base, now)).toBe("active");
	});
});
