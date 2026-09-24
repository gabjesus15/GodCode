import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createFakeSupabase, type FakeDb } from "../../stubs/fake-supabase";

const holder = vi.hoisted(() => ({ client: null as null | { from: (table: string) => unknown } }));
const sendEmail = vi.hoisted(() => vi.fn(async () => ({ status: "sent" })));

// syncCompanyPanelAccessFromPlanId usa el cliente global: apunta a la misma base falsa.
vi.mock("@/lib/infra/supabase-admin", () => ({
	supabaseAdmin: { from: (table: string) => holder.client?.from(table) },
}));
vi.mock("@/lib/email/send", () => ({ sendEmail, teamInbox: () => "equipo@test" }));

import { applyPortalPayment, type PortalPaymentRow } from "@/lib/billing/payment-review";

const NOW = new Date("2026-09-23T12:00:00.000Z");
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();
const ADDON_MONTHLY = "3f0c9b1e-7a51-4c1b-9d3e-2b8f6a4c5d10";
const ADDON_ONCE = "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d";

let db: FakeDb;
let client: SupabaseClient;

function payment(overrides: Partial<PortalPaymentRow>): PortalPaymentRow {
	return {
		id: "pay-1",
		company_id: "co-1",
		plan_id: "plan-basic",
		status: "pending_validation",
		months_paid: 1,
		payment_reference: "RENEW-1-X",
		amount_paid: 30,
		payment_date: inDays(-1),
		...overrides,
	};
}

function seed(company: Record<string, unknown>, pay: PortalPaymentRow) {
	db = {
		companies: [
			{ id: "co-1", name: "Rica Pizza", email: "dueno@rica.test", plan_id: "plan-basic", subscription_status: "active", subscription_ends_at: inDays(10), custom_domain: null, theme_config: {}, ...company },
		],
		plans: [
			{ id: "plan-basic", name: "Básico", features: [] },
			{ id: "plan-pro", name: "Pro", features: [] },
		],
		payments_history: [{ ...pay }],
		company_plan_change_schedules: [{ id: "sch-1", company_id: "co-1", target_plan_id: "plan-basic", status: "scheduled" }],
		company_addons: [{ id: "ca-1", company_id: "co-1", addon_id: ADDON_MONTHLY, status: "active", expires_at: inDays(10) }],
		company_branch_extra_entitlements: [],
		addons: [
			{ id: ADDON_MONTHLY, name: "Dominio propio", price_monthly: 5, price_one_time: null },
			{ id: ADDON_ONCE, name: "Carga de menú", price_monthly: null, price_one_time: 40 },
		],
		onboarding_applications: [],
	};
	const fake = createFakeSupabase(db);
	holder.client = fake.client;
	client = fake.client as unknown as SupabaseClient;
}

const company = () => db.companies[0];
const storedPayment = () => db.payments_history[0];

beforeEach(() => {
	sendEmail.mockClear();
});

describe("applyPortalPayment", () => {
	it("renovar suma los meses desde el vencimiento y extiende los extras", async () => {
		const pay = payment({ months_paid: 3 });
		seed({}, pay);

		const result = await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending_validation", "pending"], notify: true });

		expect(result).toMatchObject({ ok: true, kind: "renewal" });
		expect(storedPayment().status).toBe("paid");
		expect(company().subscription_ends_at).toBe(inDays(100));
		expect(company().subscription_status).toBe("active");
		expect(db.company_addons[0].expires_at).toBe(inDays(100));
		expect(sendEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				kind: "payment_received",
				to: "dueno@rica.test",
				dedupeKey: "payment-received:pay-1",
				data: expect.objectContaining({ amount: expect.stringContaining("30"), reactivated: false }),
			}),
		);
	});

	it("un pago solo se aplica una vez", async () => {
		const pay = payment({ months_paid: 1 });
		seed({}, pay);

		await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending_validation"] });
		const second = await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending_validation"] });

		expect(second).toMatchObject({ ok: false, status: 409 });
		expect(company().subscription_ends_at).toBe(inDays(40));
	});

	it("renovar una suscripción vencida con otro plan cambia el plan y cuenta desde hoy", async () => {
		const pay = payment({ plan_id: "plan-pro", months_paid: 1 });
		seed({ subscription_status: "suspended", subscription_ends_at: inDays(-20) }, pay);

		const result = await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending"] });
		expect(result).toMatchObject({ ok: false, status: 409 }); // sigue en revisión: no se reclama desde "pending"

		const applied = await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending_validation"] });
		expect(applied).toMatchObject({ ok: true, kind: "renewal" });
		expect(company().plan_id).toBe("plan-pro");
		expect(company().subscription_ends_at).toBe(inDays(30));
		expect(db.company_plan_change_schedules[0].status).toBe("cancelled");
	});

	it("con el periodo vigente la renovación no cambia el plan (lo hace el cambio programado)", async () => {
		const pay = payment({ plan_id: "plan-pro", months_paid: 1 });
		seed({}, pay);

		await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending_validation"] });

		expect(company().plan_id).toBe("plan-basic");
		expect(db.company_plan_change_schedules[0].status).toBe("scheduled");
	});

	it("subir de plan cambia el plan ya, no toca el vencimiento y anula el cambio programado", async () => {
		const pay = payment({ plan_id: "plan-pro", payment_reference: "PLANCHG-1-X", amount_paid: 12.5 });
		seed({}, pay);

		const result = await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending", "pending_validation"], method: { slug: "paypal", name: "PayPal" } });

		expect(result).toMatchObject({ ok: true, kind: "plan_change" });
		expect(company().plan_id).toBe("plan-pro");
		expect(company().subscription_ends_at).toBe(inDays(10));
		expect(db.company_plan_change_schedules[0].status).toBe("cancelled");
		expect(storedPayment()).toMatchObject({ status: "paid", payment_method: "PayPal", payment_method_slug: "paypal" });
	});

	it("un extra mensual vence con la suscripción; uno de pago único no vence", async () => {
		const monthly = payment({ payment_reference: `ADDON-${ADDON_MONTHLY}-M1-X` });
		seed({ subscription_ends_at: inDays(25) }, monthly);
		await applyPortalPayment(client, monthly, { now: NOW, claimFrom: ["pending_validation"] });
		expect(db.company_addons.find((row) => row.addon_id === ADDON_MONTHLY)?.expires_at).toBe(inDays(25));

		const once = payment({ payment_reference: `ADDON-${ADDON_ONCE}-M1-X` });
		seed({}, once);
		await applyPortalPayment(client, once, { now: NOW, claimFrom: ["pending_validation"] });
		expect(db.company_addons.find((row) => row.addon_id === ADDON_ONCE)).toMatchObject({ status: "active", expires_at: null });
	});

	it("sucursales extra: se activa la compra ligada al pago hasta el vencimiento", async () => {
		const pay = payment({ payment_reference: "CUST-1-X" });
		seed({}, pay);
		db.company_branch_extra_entitlements.push({ id: "ent-1", company_id: "co-1", payment_id: "pay-1", quantity: 1, status: "pending", expires_at: null });

		await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending_validation"] });

		expect(db.company_branch_extra_entitlements[0]).toMatchObject({ status: "active", expires_at: inDays(10) });
	});

	it("una referencia desconocida no se toca", async () => {
		const pay = payment({ payment_reference: "8XY12345AB678901C" });
		seed({}, pay);

		const result = await applyPortalPayment(client, pay, { now: NOW, claimFrom: ["pending_validation"] });

		expect(result).toMatchObject({ ok: false, status: 400 });
		expect(storedPayment().status).toBe("pending_validation");
	});
});
