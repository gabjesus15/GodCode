import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** La solicitud que encuentra el token (o `null`). */
const db: { app: Record<string, unknown> | null } = { app: null };

vi.mock("@/lib/infra/supabase-admin", () => ({
	supabaseAdmin: {
		from: (table: string) => {
			const query: Record<string, unknown> = {};
			for (const method of ["select", "eq", "in"]) query[method] = () => query;
			query.maybeSingle = async () => ({ data: table === "onboarding_applications" ? db.app : null, error: null });
			// Los extras elegidos (`onboarding_application_addons`) se esperan sin `maybeSingle`.
			query.then = (resolve: (value: unknown) => unknown) => resolve({ data: [], error: null });
			return query;
		},
	},
}));
const resolveCheckoutPlan = vi.fn();
vi.mock("@/lib/onboarding/checkout-service", () => ({
	resolveCheckoutPlan: (...args: unknown[]) => resolveCheckoutPlan(...args),
	resolveCheckoutPlanPrice: () => ({ price: 29, currency: "USD", continent: "america", source: "regional" }),
	priceApplicationAddons: async () => [],
	getMercadoPagoOffer: async () => null,
}));
vi.mock("@/lib/onboarding/first-payment-promo-service", () => ({ isFirstPaymentPromoEligible: async () => true }));
const loadStoreDraftState = vi.fn();
vi.mock("@/lib/onboarding/store-draft-service", () => ({
	loadStoreDraftState: (...args: unknown[]) => loadStoreDraftState(...args),
}));
vi.mock("@/lib/billing/subscription-coupon-service", () => ({
	checkCouponForApplication: async () => ({ ok: true }),
	findSubscriptionCouponById: async () => null,
}));

import { GET } from "@/services/onboarding-billing/app/api/onboarding/application/route";

const APP = {
	id: "app-1",
	email: "dueno@local.com",
	status: "form_completed",
	company_id: null,
	plan_id: "plan-panel",
	business_name: "Rica Pizza",
	subscription_payment_method: null,
	payment_status: null,
	payment_reference_url: null,
	country: "CL",
	coupon_id: null,
	coupon_code: null,
};

const PANEL_PLAN = { id: "plan-panel", name: "Panel", price: 29, max_branches: 1, max_users: 5, features: { product_mode: "panel_only" } };
const STORE_PLAN = { id: "plan-pro", name: "Pro", price: 39, max_branches: 1, max_users: 5, features: {} };

async function application() {
	const res = await GET(new NextRequest("http://localhost/api/onboarding/application?token=tok-1"));
	return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
	db.app = { ...APP };
	resolveCheckoutPlan.mockReset();
	resolveCheckoutPlan.mockResolvedValue({ plan: PANEL_PLAN });
	loadStoreDraftState.mockReset();
	loadStoreDraftState.mockResolvedValue({ pending: false, fromDraft: false, slug: null });
});

describe("GET /api/onboarding/application: «solo panel CEO»", () => {
	it("con «solo panel CEO» y sin tienda lo dice, y el presupuesto sale del mismo plan", async () => {
		const { status, body } = await application();
		expect(status).toBe(200);
		expect(body).toMatchObject({ panel_only: true, store_draft: false, quote: { plan: { name: "Panel", monthly: 29 } } });
		// El plan se lee una sola vez para las dos cosas.
		expect(resolveCheckoutPlan).toHaveBeenCalledTimes(1);
		expect(loadStoreDraftState).not.toHaveBeenCalled();
	});

	it("ya pagado, la empresa sin tienda armada sigue siendo «solo panel CEO»", async () => {
		db.app = { ...APP, company_id: "co-1", payment_status: "paid" };
		const { body } = await application();
		expect(body).toMatchObject({ panel_only: true, store_draft: false });
		expect(loadStoreDraftState).toHaveBeenCalledWith(expect.anything(), "co-1");
	});

	it("con una tienda armada es false aunque el plan guardado sea «solo panel CEO»", async () => {
		db.app = { ...APP, company_id: "co-1" };
		loadStoreDraftState.mockResolvedValue({ pending: true, fromDraft: true, slug: "rica-pizza" });
		const { body } = await application();
		expect(body).toMatchObject({ panel_only: false, store_draft: true });
	});

	it("con un plan con tienda es false", async () => {
		db.app = { ...APP, plan_id: "plan-pro" };
		resolveCheckoutPlan.mockResolvedValue({ plan: STORE_PLAN });
		const { body } = await application();
		expect(body).toMatchObject({ panel_only: false, quote: { plan: { name: "Pro" } } });
	});

	it("si no se puede leer el plan es false, sin presupuesto y sin romper la página", async () => {
		resolveCheckoutPlan.mockRejectedValue(new Error("sin base"));
		const { status, body } = await application();
		expect(status).toBe(200);
		expect(body).toMatchObject({ panel_only: false, quote: null });
	});

	it("un plan que ya no está a la venta tampoco cuenta como «solo panel CEO»", async () => {
		resolveCheckoutPlan.mockResolvedValue({ plan: null, error: "Ese plan ya no está disponible. Elige otro.", status: 409 });
		const { body } = await application();
		expect(body).toMatchObject({ panel_only: false, quote: null });
	});

	it("si hay empresa y no se puede leer si es una tienda armada, es false", async () => {
		db.app = { ...APP, company_id: "co-1" };
		loadStoreDraftState.mockRejectedValue(new Error("sin base"));
		const { body } = await application();
		expect(body).toMatchObject({ panel_only: false, store_draft: false });
	});

	it("un token que no existe responde 404", async () => {
		db.app = null;
		const { status } = await application();
		expect(status).toBe(404);
		expect(resolveCheckoutPlan).not.toHaveBeenCalled();
	});
});
