import { beforeEach, describe, expect, it, vi } from "vitest";

const getPayPalOrder = vi.fn();
const capturePayPalOrder = vi.fn();
vi.mock("@/lib/payments/paypal", () => ({
	getPayPalOrder: (...args: unknown[]) => getPayPalOrder(...args),
	capturePayPalOrder: (...args: unknown[]) => capturePayPalOrder(...args),
	toCents: (value: unknown) => Math.round(Number(value) * 100),
}));
const completeOnboardingPayment = vi.fn();
vi.mock("@/lib/onboarding/complete-onboarding-payment", () => ({
	completeOnboardingPayment: (...args: unknown[]) => completeOnboardingPayment(...args),
}));
const alertOnboardingTeam = vi.fn(async () => undefined);
vi.mock("@/lib/onboarding/team-alerts", () => ({ alertOnboardingTeam: (...args: unknown[]) => alertOnboardingTeam(...(args as [])) }));

import { applyOnboardingPayPalWebhook, captureOnboardingPayPalOrder } from "@/lib/onboarding/paypal-onboarding";

const APP = { id: "app-1", payment_reference: "ORDER-1", payment_amount: 29, verification_token: "tok", business_name: "Rica Pizza", email: "a@b.com" };

function adminWith(app: unknown) {
	const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: app }) };
	return { from: () => query } as never;
}

const order = (status: string) => ({
	status,
	meta: { kind: "onboarding", applicationId: "app-1", chargedMonths: 1, grantedMonths: 1, promoApplied: false },
	amountCents: 2900,
	currency: "USD",
	payerEmail: "p@x.com",
	payerId: "PAYER",
});

beforeEach(() => {
	getPayPalOrder.mockReset();
	capturePayPalOrder.mockReset();
	completeOnboardingPayment.mockReset();
	alertOnboardingTeam.mockClear();
});

describe("captureOnboardingPayPalOrder", () => {
	it("si otra vía está cerrando el mismo pago, no es un error para el cliente", async () => {
		getPayPalOrder.mockResolvedValue(order("COMPLETED"));
		completeOnboardingPayment.mockResolvedValue({ ok: false, error: "procesando", status: 409, inProgress: true });
		const result = await captureOnboardingPayPalOrder({ supabaseAdmin: adminWith(APP), orderId: "ORDER-1" });
		expect(result).toEqual({ ok: true, ref: "ORDER-1" });
	});

	it("cobrado sin alta queda marcado como cobro que necesita al equipo", async () => {
		getPayPalOrder.mockResolvedValue(order("APPROVED"));
		capturePayPalOrder.mockResolvedValue(order("COMPLETED"));
		completeOnboardingPayment.mockResolvedValue({ ok: false, error: "No se pudo registrar el pago", status: 500 });
		const result = await captureOnboardingPayPalOrder({ supabaseAdmin: adminWith(APP), orderId: "ORDER-1" });
		expect(result).toMatchObject({ ok: false, code: "charged_not_applied", businessName: "Rica Pizza" });
	});

	it("una orden que nadie aprobó no es un cobro", async () => {
		getPayPalOrder.mockResolvedValue(order("CREATED"));
		capturePayPalOrder.mockResolvedValue(order("CREATED"));
		const result = await captureOnboardingPayPalOrder({ supabaseAdmin: adminWith(APP), orderId: "ORDER-1" });
		expect(result).toMatchObject({ ok: false, code: "not_completed" });
		expect(completeOnboardingPayment).not.toHaveBeenCalled();
	});
});

describe("applyOnboardingPayPalWebhook", () => {
	it("avisa al equipo por Telegram cuando PayPal cobró y el alta no se cerró", async () => {
		getPayPalOrder.mockResolvedValue(order("COMPLETED"));
		completeOnboardingPayment.mockResolvedValue({ ok: false, error: "x", status: 500 });
		const result = await applyOnboardingPayPalWebhook({ supabaseAdmin: adminWith(APP), orderId: "ORDER-1" });
		expect(result).toEqual({ outcome: "failed", reason: "charged_not_applied" });
		expect(alertOnboardingTeam).toHaveBeenCalledWith(expect.objectContaining({ kind: "needs_attention", businessName: "Rica Pizza" }));
	});

	it("una orden del portal se ignora", async () => {
		getPayPalOrder.mockResolvedValue({ ...order("COMPLETED"), meta: { kind: "portal", paymentId: "p1" } });
		const result = await applyOnboardingPayPalWebhook({ supabaseAdmin: adminWith(APP), orderId: "ORDER-1" });
		expect(result).toEqual({ outcome: "ignored", reason: "not_onboarding" });
		expect(alertOnboardingTeam).not.toHaveBeenCalled();
	});

	it("si PayPal no responde, pide reintento", async () => {
		getPayPalOrder.mockResolvedValue(null);
		const result = await applyOnboardingPayPalWebhook({ supabaseAdmin: adminWith(APP), orderId: "ORDER-1" });
		expect(result).toEqual({ outcome: "retry", reason: "paypal_unavailable" });
	});
});
