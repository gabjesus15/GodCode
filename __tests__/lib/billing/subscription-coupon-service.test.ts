import { describe, expect, it, vi } from "vitest";

import {
	checkCouponForApplication,
	findSubscriptionCouponByCode,
	redeemSubscriptionCoupon,
} from "@/lib/billing/subscription-coupon-service";
import type { SubscriptionCouponRow } from "@/lib/billing/subscription-coupons";
import { makeAdminMock } from "../menu-account/test-supabase-mock";

function coupon(overrides: Partial<SubscriptionCouponRow> = {}): SubscriptionCouponRow {
	return {
		id: "c1",
		code: "PROMO2026",
		description: null,
		kind: "percent",
		value: 20,
		min_months: 1,
		plan_ids: null,
		keeps_promo: true,
		max_redemptions: null,
		redemptions_count: 0,
		valid_from: null,
		valid_until: null,
		is_active: true,
		...overrides,
	};
}

describe("findSubscriptionCouponByCode", () => {
	it("no consulta la base con un código mal formado", async () => {
		const admin = makeAdminMock({ tables: { subscription_coupons: [] } });
		expect(await findSubscriptionCouponByCode(admin as never, "ab")).toBeNull();
		expect(admin.from).not.toHaveBeenCalled();
	});

	it("busca por el código normalizado y convierte los números", async () => {
		const admin = makeAdminMock({ tables: { subscription_coupons: [{ data: { ...coupon(), value: "20.00", redemptions_count: "3" }, error: null }] } });
		const row = await findSubscriptionCouponByCode(admin as never, " promo 2026 ");
		expect(admin.chains[0].chain.eq).toHaveBeenCalledWith("code", "PROMO2026");
		expect(row).toMatchObject({ code: "PROMO2026", value: 20, redemptions_count: 3 });
	});
});

describe("checkCouponForApplication", () => {
	it("sin cupón: not_found", async () => {
		const admin = makeAdminMock({ tables: {} });
		expect(await checkCouponForApplication(admin as never, { coupon: null, email: "a@b.com", planId: "p1" })).toMatchObject({ ok: false, problem: "not_found" });
	});

	it("vigencia y plan antes que la base; el correo repetido al final", async () => {
		const admin = makeAdminMock({ tables: { subscription_coupon_redemptions: [{ data: { id: "r1" }, error: null }] } });
		expect(await checkCouponForApplication(admin as never, { coupon: coupon({ is_active: false }), email: "a@b.com", planId: "p1" })).toMatchObject({ problem: "inactive" });
		expect(await checkCouponForApplication(admin as never, { coupon: coupon({ plan_ids: ["otro"] }), email: "a@b.com", planId: "p1" })).toMatchObject({ problem: "plan_not_allowed" });
		expect(await checkCouponForApplication(admin as never, { coupon: coupon({ min_months: 6 }), email: "a@b.com", planId: "p1", months: 3 })).toMatchObject({ problem: "min_months" });
		expect(admin.from).not.toHaveBeenCalled();

		expect(await checkCouponForApplication(admin as never, { coupon: coupon(), email: "A@B.com", planId: "p1" })).toMatchObject({ problem: "already_used" });
		expect(admin.chains[0].chain.eq).toHaveBeenCalledWith("email_normalized", "a@b.com");
	});

	it("acepta un cupón vigente sin canje previo", async () => {
		const admin = makeAdminMock({ tables: { subscription_coupon_redemptions: [{ data: null, error: null }] } });
		const result = await checkCouponForApplication(admin as never, { coupon: coupon(), email: "a@b.com", planId: "p1", months: 1 });
		expect(result).toMatchObject({ ok: true, coupon: { code: "PROMO2026" } });
	});
});

describe("redeemSubscriptionCoupon", () => {
	it("llama al RPC con el correo normalizado y devuelve lo que dijo la base", async () => {
		const rpc = vi.fn(async () => ({ data: true, error: null }));
		const ok = await redeemSubscriptionCoupon({ rpc } as never, {
			couponId: "c1",
			email: " A@B.com ",
			applicationId: "app1",
			companyId: "co1",
			paymentReference: "manual-1",
			baseAmountUsd: 57,
			discountUsd: 11.4,
			freeMonths: 0,
		});
		expect(ok).toBe(true);
		expect(rpc).toHaveBeenCalledWith("redeem_subscription_coupon", {
			p_coupon_id: "c1",
			p_email: "a@b.com",
			p_application_id: "app1",
			p_company_id: "co1",
			p_payment_reference: "manual-1",
			p_base_amount_usd: 57,
			p_discount_usd: 11.4,
			p_free_months: 0,
		});
	});

	it("nunca lanza: un error de la base devuelve false", async () => {
		const rpc = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
		expect(await redeemSubscriptionCoupon({ rpc } as never, { couponId: "c1", email: "a@b.com" })).toBe(false);
		const throwing = vi.fn(async () => {
			throw new Error("red");
		});
		expect(await redeemSubscriptionCoupon({ rpc: throwing } as never, { couponId: "c1", email: "a@b.com" })).toBe(false);
	});
});
