import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createFakeSupabase, type FakeDb } from "../../stubs/fake-supabase";

const getOrder = vi.hoisted(() => vi.fn());
const complete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/payments/mercadopago", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/payments/mercadopago")>()),
	getMercadoPagoOrder: (...args: unknown[]) => getOrder(...args),
}));
vi.mock("@/lib/onboarding/complete-onboarding-payment", () => ({
	completeOnboardingPayment: (...args: unknown[]) => complete(...args),
}));

import { captureOnboardingMercadoPagoOrder } from "@/lib/onboarding/mercadopago-onboarding";

const ORDER_ID = "ORD01M28P44G5FG8RJPM579EH56FV";

function order(overrides: Record<string, unknown> = {}) {
	return {
		id: ORDER_ID,
		status: "processed",
		statusDetail: "accredited",
		externalReference: "ob_app-1_3_4_1",
		currency: "CLP",
		totalAmount: 54150,
		totalPaidAmount: 54150,
		...overrides,
	};
}

let db: FakeDb;
let client: SupabaseClient;

beforeEach(() => {
	db = {
		onboarding_applications: [
			{
				id: "app-1",
				payment_reference: ORDER_ID,
				payment_amount: 57,
				verification_token: "tok-1",
				subscription_payment_method: "paypal",
			},
		],
	};
	client = createFakeSupabase(db).client as unknown as SupabaseClient;
	getOrder.mockReset();
	complete.mockReset();
	complete.mockResolvedValue({ ok: true, companyId: "co-1", alreadyCompleted: false, ownerReady: true, welcomeSent: true });
});

describe("captureOnboardingMercadoPagoOrder", () => {
	it("orden cobrada y vigente: cierra el alta con los meses de la orden y el monto en USD", async () => {
		getOrder.mockResolvedValue(order());
		const result = await captureOnboardingMercadoPagoOrder({ supabaseAdmin: client, orderId: ORDER_ID });

		expect(result).toEqual({ ok: true, ref: ORDER_ID });
		expect(complete).toHaveBeenCalledWith(
			expect.objectContaining({
				applicationId: "app-1",
				paymentReference: ORDER_ID,
				amountPaid: 57,
				methodSlug: "mercadopago",
				chargedMonths: 3,
				grantedMonths: 4,
				promoApplied: true,
				isManualPayment: false,
			}),
		);
		expect(db.onboarding_applications[0].subscription_payment_method).toBe("mercadopago");
	});

	it("una orden que ya no es la vigente no activa nada", async () => {
		db.onboarding_applications[0].payment_reference = "ORD-NUEVA";
		getOrder.mockResolvedValue(order());
		const result = await captureOnboardingMercadoPagoOrder({ supabaseAdmin: client, orderId: ORDER_ID });

		expect(result).toMatchObject({ ok: false, reason: "rejected", verificationToken: "tok-1" });
		expect(complete).not.toHaveBeenCalled();
	});

	it("cobro parcial o en proceso: queda pendiente", async () => {
		getOrder.mockResolvedValue(order({ totalPaidAmount: 1000 }));
		expect(await captureOnboardingMercadoPagoOrder({ supabaseAdmin: client, orderId: ORDER_ID })).toMatchObject({ ok: false, reason: "pending" });
		getOrder.mockResolvedValue(order({ status: "action_required", totalPaidAmount: 0 }));
		expect(await captureOnboardingMercadoPagoOrder({ supabaseAdmin: client, orderId: ORDER_ID })).toMatchObject({ ok: false, reason: "pending" });
		expect(complete).not.toHaveBeenCalled();
	});

	it("orden fallida: hay que volver a pagar", async () => {
		getOrder.mockResolvedValue(order({ status: "failed", totalPaidAmount: 0 }));
		const result = await captureOnboardingMercadoPagoOrder({ supabaseAdmin: client, orderId: ORDER_ID });
		expect(result).toMatchObject({ ok: false, reason: "failed", verificationToken: "tok-1" });
		expect(complete).not.toHaveBeenCalled();
	});

	it("otra moneda no se acepta", async () => {
		getOrder.mockResolvedValue(order({ currency: "USD" }));
		expect(await captureOnboardingMercadoPagoOrder({ supabaseAdmin: client, orderId: ORDER_ID })).toMatchObject({ ok: false, reason: "rejected" });
		expect(complete).not.toHaveBeenCalled();
	});

	it("una orden que no es de un alta se ignora", async () => {
		getOrder.mockResolvedValue(order({ externalReference: "pedido-123" }));
		expect(await captureOnboardingMercadoPagoOrder({ supabaseAdmin: client, orderId: ORDER_ID })).toMatchObject({ ok: false, reason: "ignored" });
	});

	it("si Mercado Pago no responde, se reintenta después", async () => {
		getOrder.mockResolvedValue(null);
		expect(await captureOnboardingMercadoPagoOrder({ supabaseAdmin: client, orderId: ORDER_ID })).toMatchObject({ ok: false, reason: "pending", status: 502 });
	});
});
