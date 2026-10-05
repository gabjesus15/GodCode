import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const getPayPalOrder = vi.fn();
const capturePayPalOrder = vi.fn();
const applyPortalPayment = vi.fn();

vi.mock("@/lib/payments/paypal", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@/lib/payments/paypal")>();
	return {
		...actual,
		getPayPalOrder: (...args: unknown[]) => getPayPalOrder(...args),
		capturePayPalOrder: (...args: unknown[]) => capturePayPalOrder(...args),
	};
});
vi.mock("@/lib/billing/payment-review", () => ({
	PORTAL_PAYMENT_COLUMNS: "id,company_id",
	applyPortalPayment: (...args: unknown[]) => applyPortalPayment(...args),
}));
vi.mock("@/lib/onboarding/trial-eligibility", () => ({
	hashPaymentIdentity: (value: string) => `hash:${value}`,
	normalizeEmail: (value: string | null) => String(value ?? "").toLowerCase(),
}));

import { applyCompletedPortalPayPalOrder } from "@/lib/billing/portal-paypal";

const PAYMENT = {
	id: "pay-1",
	company_id: "acme",
	plan_id: "plan",
	status: "pending",
	months_paid: 1,
	payment_reference: "REN-1",
	amount_paid: 29,
	payment_date: null,
};

function order(overrides: Record<string, unknown> = {}) {
	return {
		status: "COMPLETED",
		meta: { kind: "portal", paymentId: "pay-1" },
		amountCents: 2900,
		currency: "USD",
		payerEmail: "Ana@Example.com",
		payerId: "PAYER",
		...overrides,
	};
}

function db(payment: unknown = PAYMENT) {
	return makeAdminMock({
		tables: {
			payments_history: [{ data: payment, error: null }],
			saas_tickets: [{ data: null, error: null }],
		},
	});
}

const run = (admin: ReturnType<typeof makeAdminMock>) =>
	applyCompletedPortalPayPalOrder({ supabaseAdmin: admin as unknown as SupabaseClient, orderId: "ORDER-9" });

/**
 * El webhook aplica lo que PayPal ya cobró, con los mismos controles que la captura,
 * sin volver a cobrar y sin aplicar dos veces.
 */
describe("applyCompletedPortalPayPalOrder", () => {
	beforeEach(() => {
		getPayPalOrder.mockReset();
		capturePayPalOrder.mockReset();
		applyPortalPayment.mockReset();
	});

	it("aplica el pedido del portal cobrado por el importe exacto, sin capturar", async () => {
		getPayPalOrder.mockResolvedValue(order());
		applyPortalPayment.mockResolvedValue({ ok: true, message: "Pago validado: x" });
		const result = await run(db());
		expect(result).toEqual({ outcome: "applied" });
		expect(capturePayPalOrder).not.toHaveBeenCalled();
		expect(applyPortalPayment).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ id: "pay-1" }),
			expect.objectContaining({
				claimFrom: ["pending", "pending_validation", "rejected", "cancelled"],
				method: { slug: "paypal", name: "PayPal" },
				paypalPayerIdHash: "hash:PAYER",
			}),
		);
	});

	it("un pedido ya pagado no se vuelve a aplicar", async () => {
		getPayPalOrder.mockResolvedValue(order());
		const result = await run(db({ ...PAYMENT, status: "paid" }));
		expect(result).toEqual({ outcome: "already_paid" });
		expect(applyPortalPayment).not.toHaveBeenCalled();
	});

	it("si la captura lo aplicó a la vez, cuenta como ya pagado", async () => {
		getPayPalOrder.mockResolvedValue(order());
		applyPortalPayment.mockResolvedValue({ ok: false, error: "ya procesado", status: 409 });
		const admin = makeAdminMock({
			tables: {
				payments_history: [{ data: PAYMENT, error: null }, { data: { status: "paid" }, error: null }],
				saas_tickets: [{ data: null, error: null }],
			},
		});
		expect(await run(admin)).toEqual({ outcome: "already_paid" });
		expect(admin.fromCalls).not.toContain("saas_tickets");
	});

	it("un importe distinto no se aplica y abre ticket", async () => {
		getPayPalOrder.mockResolvedValue(order({ amountCents: 100 }));
		const admin = db();
		const result = await run(admin);
		expect(result).toMatchObject({ outcome: "ignored", reason: "amount_mismatch" });
		expect(applyPortalPayment).not.toHaveBeenCalled();
		expect(admin.fromCalls).toContain("saas_tickets");
	});

	it("órdenes que no son del portal se ignoran", async () => {
		getPayPalOrder.mockResolvedValue(order({ meta: { kind: "onboarding", applicationId: "a", chargedMonths: 1, grantedMonths: 1 } }));
		const admin = db();
		expect(await run(admin)).toMatchObject({ outcome: "ignored" });
		expect(admin.from).not.toHaveBeenCalled();
	});

	it("si PayPal no responde o la orden no está cobrada, pide reintento", async () => {
		getPayPalOrder.mockResolvedValue(null);
		expect(await run(db())).toMatchObject({ outcome: "retry" });
		getPayPalOrder.mockResolvedValue(order({ status: "APPROVED" }));
		expect(await run(db())).toMatchObject({ outcome: "retry" });
		expect(applyPortalPayment).not.toHaveBeenCalled();
	});
});
