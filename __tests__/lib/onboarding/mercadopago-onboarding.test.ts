import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createFakeSupabase, type FakeDb } from "../../stubs/fake-supabase";

const getPayment = vi.hoisted(() => vi.fn());
const complete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/payments/mercadopago", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/payments/mercadopago")>()),
	getMercadoPagoPayment: (...args: unknown[]) => getPayment(...args),
}));
vi.mock("@/lib/onboarding/complete-onboarding-payment", () => ({
	completeOnboardingPayment: (...args: unknown[]) => complete(...args),
}));

import { captureOnboardingMercadoPagoPayment, findOnboardingTokenByReference } from "@/lib/onboarding/mercadopago-onboarding";

const PAYMENT_ID = "183313688092";
const REF = "ob_app-1_3_4_1_0a1b2c3d4e";

function payment(overrides: Record<string, unknown> = {}) {
	return {
		id: PAYMENT_ID,
		status: "approved",
		externalReference: REF,
		currency: "CLP",
		amount: 54150,
		itemsTotal: 54150,
		...overrides,
	};
}

let db: FakeDb;
let client: SupabaseClient;
const capture = () => captureOnboardingMercadoPagoPayment({ supabaseAdmin: client, paymentId: PAYMENT_ID });

beforeEach(() => {
	db = {
		onboarding_applications: [
			{
				id: "app-1",
				payment_reference: REF,
				payment_amount: 57,
				verification_token: "tok-1",
				subscription_payment_method: "paypal",
			},
		],
	};
	client = createFakeSupabase(db).client as unknown as SupabaseClient;
	getPayment.mockReset();
	complete.mockReset();
	complete.mockResolvedValue({ ok: true, companyId: "co-1", alreadyCompleted: false, ownerReady: true, welcomeSent: true });
});

describe("captureOnboardingMercadoPagoPayment", () => {
	it("pago aprobado del checkout vigente: cierra el alta con los meses de la referencia y el monto en USD", async () => {
		getPayment.mockResolvedValue(payment());
		const result = await capture();

		expect(getPayment).toHaveBeenCalledWith(PAYMENT_ID);
		expect(result).toEqual({ ok: true, ref: REF });
		expect(complete).toHaveBeenCalledWith(
			expect.objectContaining({
				applicationId: "app-1",
				paymentReference: REF,
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

	it("un pago de un checkout que ya no es el vigente no activa nada", async () => {
		db.onboarding_applications[0].payment_reference = "ob_app-1_3_4_1_ffffffffff";
		getPayment.mockResolvedValue(payment());
		expect(await capture()).toMatchObject({ ok: false, reason: "rejected", verificationToken: "tok-1" });
		expect(complete).not.toHaveBeenCalled();
	});

	it("pago en proceso o autorizado sin capturar: queda pendiente", async () => {
		for (const status of ["in_process", "pending", "authorized"]) {
			getPayment.mockResolvedValue(payment({ status }));
			expect(await capture()).toMatchObject({ ok: false, reason: "pending", verificationToken: "tok-1" });
		}
		expect(complete).not.toHaveBeenCalled();
	});

	it("pago rechazado: hay que volver a pagar", async () => {
		getPayment.mockResolvedValue(payment({ status: "rejected" }));
		expect(await capture()).toMatchObject({ ok: false, reason: "failed", verificationToken: "tok-1" });
		expect(complete).not.toHaveBeenCalled();
	});

	it("otra moneda, un monto vacío o menor al de la preferencia no se aceptan", async () => {
		getPayment.mockResolvedValue(payment({ currency: "USD" }));
		expect(await capture()).toMatchObject({ ok: false, reason: "rejected" });
		getPayment.mockResolvedValue(payment({ amount: 0, itemsTotal: 0 }));
		expect(await capture()).toMatchObject({ ok: false, reason: "rejected" });
		getPayment.mockResolvedValue(payment({ amount: 1000 }));
		expect(await capture()).toMatchObject({ ok: false, reason: "rejected" });
		expect(complete).not.toHaveBeenCalled();
	});

	it("un pago que no es de un alta, o que no existe, se ignora", async () => {
		getPayment.mockResolvedValue(payment({ externalReference: "pedido-123" }));
		expect(await capture()).toMatchObject({ ok: false, reason: "ignored" });
		getPayment.mockResolvedValue(payment({ externalReference: null }));
		expect(await capture()).toMatchObject({ ok: false, reason: "ignored" });
		getPayment.mockResolvedValue(null);
		expect(await capture()).toMatchObject({ ok: false, reason: "ignored", status: 404 });
		expect(complete).not.toHaveBeenCalled();
	});

	it("si Mercado Pago no responde, se reintenta después", async () => {
		getPayment.mockResolvedValue(undefined);
		expect(await capture()).toMatchObject({ ok: false, reason: "pending", status: 502 });
	});

	it("si el cierre falla, queda pendiente para reintentar", async () => {
		getPayment.mockResolvedValue(payment());
		complete.mockResolvedValue({ ok: false, error: "falló", status: 500 });
		expect(await capture()).toMatchObject({ ok: false, reason: "pending", status: 500, verificationToken: "tok-1" });
	});
});

describe("findOnboardingTokenByReference", () => {
	it("solo con la referencia exacta del checkout vigente", async () => {
		expect(await findOnboardingTokenByReference(client, REF)).toBe("tok-1");
		expect(await findOnboardingTokenByReference(client, "ob_app-1_3_4_1_ffffffffff")).toBeNull();
		expect(await findOnboardingTokenByReference(client, "app-1")).toBeNull();
		expect(await findOnboardingTokenByReference(client, "")).toBeNull();
	});
});
