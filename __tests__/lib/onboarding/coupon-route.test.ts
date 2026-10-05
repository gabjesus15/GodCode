import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const adminHolder = { current: makeAdminMock({ tables: {} }) };
vi.mock("@/lib/infra/supabase-admin", () => ({
	get supabaseAdmin() {
		return adminHolder.current;
	},
}));

import { DELETE, POST } from "../../../services/onboarding-billing/app/api/onboarding/coupon/route";

const APP = { id: "app1", email: "nelli@example.com", plan_id: "p1", status: "form_completed", payment_status: null, payment_reference_url: null, coupon_id: null };
const COUPON = {
	id: "c1",
	code: "LANZAMIENTO20",
	description: "Campaña",
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
};

function post(body: unknown) {
	return POST(new NextRequest("http://localhost/api/onboarding/coupon", { method: "POST", body: JSON.stringify(body) }));
}
function del(body: unknown) {
	return DELETE(new NextRequest("http://localhost/api/onboarding/coupon", { method: "DELETE", body: JSON.stringify(body) }));
}

describe("POST /api/onboarding/coupon", () => {
	beforeEach(() => {
		adminHolder.current = makeAdminMock({
			tables: {
				onboarding_applications: [{ data: APP, error: null }, { data: null, error: null }],
				subscription_coupons: [{ data: COUPON, error: null }],
				subscription_coupon_redemptions: [{ data: null, error: null }],
			},
		});
	});

	it("sin token no toca la base", async () => {
		const res = await post({ code: "LANZAMIENTO20" });
		expect(res.status).toBe(400);
		expect(adminHolder.current.from).not.toHaveBeenCalled();
	});

	it("un código mal formado no se busca", async () => {
		const res = await post({ token: "tok", code: "ab" });
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ problem: "invalid_format" });
		expect(adminHolder.current.from).not.toHaveBeenCalled();
	});

	it("guarda el cupón en la solicitud y devuelve lo que la página muestra", async () => {
		const res = await post({ token: "tok", code: " lanzamiento20 " });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			ok: true,
			coupon: { id: "c1", code: "LANZAMIENTO20", kind: "percent", value: 20, description: "Campaña", minMonths: 1, keepsPromo: true },
		});
		const update = adminHolder.current.chains.find((entry) => entry.table === "onboarding_applications" && (entry.chain.update as ReturnType<typeof vi.fn>).mock.calls.length > 0);
		expect(update).toBeTruthy();
		expect((update!.chain.update as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({
			coupon_id: "c1",
			coupon_code: "LANZAMIENTO20",
			coupon_discount_usd: null,
			coupon_free_months: null,
		});
	});

	it("un cupón desconocido responde 404 con su motivo", async () => {
		adminHolder.current = makeAdminMock({
			tables: { onboarding_applications: [{ data: APP, error: null }], subscription_coupons: [{ data: null, error: null }] },
		});
		const res = await post({ token: "tok", code: "NOEXISTE" });
		expect(res.status).toBe(404);
		expect(await res.json()).toMatchObject({ problem: "not_found" });
	});

	it("con un comprobante en revisión no se puede cambiar", async () => {
		adminHolder.current = makeAdminMock({
			tables: { onboarding_applications: [{ data: { ...APP, payment_status: "pending_validation", payment_reference_url: "https://x/r.jpg" }, error: null }] },
		});
		const res = await post({ token: "tok", code: "LANZAMIENTO20" });
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ problem: "locked" });
	});

	it("un cupón de otro plan se rechaza sin guardarlo", async () => {
		adminHolder.current = makeAdminMock({
			tables: {
				onboarding_applications: [{ data: APP, error: null }],
				subscription_coupons: [{ data: { ...COUPON, plan_ids: ["otro-plan"] }, error: null }],
			},
		});
		const res = await post({ token: "tok", code: "LANZAMIENTO20" });
		expect(res.status).toBe(409);
		expect(await res.json()).toMatchObject({ problem: "plan_not_allowed" });
		expect(adminHolder.current.chains.filter((entry) => entry.table === "onboarding_applications")).toHaveLength(1);
	});
});

describe("DELETE /api/onboarding/coupon", () => {
	it("quita el cupón de la solicitud", async () => {
		adminHolder.current = makeAdminMock({
			tables: { onboarding_applications: [{ data: { ...APP, coupon_id: "c1" }, error: null }, { data: null, error: null }] },
		});
		const res = await del({ token: "tok" });
		expect(res.status).toBe(200);
		const update = adminHolder.current.chains[1].chain.update as ReturnType<typeof vi.fn>;
		expect(update.mock.calls[0][0]).toMatchObject({ coupon_id: null, coupon_code: null });
	});

	it("sin cupón aplicado no escribe nada", async () => {
		adminHolder.current = makeAdminMock({ tables: { onboarding_applications: [{ data: APP, error: null }] } });
		const res = await del({ token: "tok" });
		expect(res.status).toBe(200);
		expect(adminHolder.current.chains).toHaveLength(1);
	});
});
