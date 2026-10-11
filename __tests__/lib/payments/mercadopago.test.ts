import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
vi.mock("@/lib/onboarding/mercadopago-onboarding", () => ({
	captureOnboardingMercadoPagoPayment: (...args: unknown[]) => capture(...args),
}));
vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: { tag: "admin" } }));

import { parsePayPalCustomId } from "@/lib/payments/paypal";
import {
	fromMercadoPagoReference,
	isMercadoPagoCheckoutReference,
	isMercadoPagoNumericId,
	mercadoPagoPaymentState,
	newMercadoPagoCheckoutReference,
	parseUsdClpRate,
	toClp,
	toMercadoPagoReference,
	verifyMercadoPagoSignature,
} from "@/lib/payments/mercadopago";
import { POST } from "@/app/api/payments/mercadopago/webhook/route";

const SECRET = "a".repeat(64);
const PAYMENT_ID = "123456789012";
const ORDER_ID = "36012345678";

/** Firma como la calcula Mercado Pago: el id va en minúsculas en el manifest. */
function sign(dataId: string, requestId: string, ts = "1742505638683", secret = SECRET) {
	const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
	return `ts=${ts},v1=${createHmac("sha256", secret).update(manifest).digest("hex")}`;
}

function webhookRequest(params: { dataId?: string; type?: string; signature?: string; requestId?: string }) {
	const query = new URLSearchParams();
	if (params.dataId) query.set("data.id", params.dataId);
	query.set("type", params.type ?? "payment");
	const headers: Record<string, string> = { "x-request-id": params.requestId ?? "req-1" };
	if (params.signature) headers["x-signature"] = params.signature;
	return new NextRequest(`http://localhost/api/payments/mercadopago/webhook?${query}`, {
		method: "POST",
		headers,
		body: JSON.stringify({ action: "payment.updated", type: params.type ?? "payment", data: { id: params.dataId } }),
	});
}

beforeEach(() => {
	vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", SECRET);
	capture.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("montos en CLP", () => {
	it("convierte a la tasa y redondea al peso", () => {
		expect(toClp(19, 950)).toBe(18050);
		expect(toClp(57.33, 950)).toBe(54464);
		expect(toClp(0, 950)).toBe(0);
		expect(toClp(19, 0)).toBe(0);
	});

	it("la tasa del panel acepta coma decimal y rechaza lo que no es un número positivo", () => {
		expect(parseUsdClpRate("950")).toBe(950);
		expect(parseUsdClpRate(" 950,5 ")).toBe(950.5);
		expect(parseUsdClpRate("0")).toBeNull();
		expect(parseUsdClpRate("-1")).toBeNull();
		expect(parseUsdClpRate("abc")).toBeNull();
		expect(parseUsdClpRate(null)).toBeNull();
	});
});

describe("external_reference", () => {
	it("cambia el `|` de PayPal por `_` (Mercado Pago solo acepta letras, números, - y _) y se lee de vuelta", () => {
		const customId = "ob|0b6f1c2e-9a3d-4e5f-8a7b-1c2d3e4f5a6b|12|13|1";
		const reference = toMercadoPagoReference(customId);
		expect(reference).toBe("ob_0b6f1c2e-9a3d-4e5f-8a7b-1c2d3e4f5a6b_12_13_1");
		expect(reference).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
		expect(fromMercadoPagoReference(reference)).toBe(customId);
		expect(fromMercadoPagoReference(null)).toBe("");
	});

	it("cada checkout lleva un sufijo único que cabe en 64 caracteres y no cambia lo que se lee", () => {
		const customId = "ob|0b6f1c2e-9a3d-4e5f-8a7b-1c2d3e4f5a6b|12|24|1";
		const a = newMercadoPagoCheckoutReference(customId);
		const b = newMercadoPagoCheckoutReference(customId);
		expect(a).not.toBe(b);
		expect(a).toMatch(/^ob_0b6f1c2e-9a3d-4e5f-8a7b-1c2d3e4f5a6b_12_24_1_[0-9a-f]{10}$/);
		expect(a.length).toBeLessThanOrEqual(64);
		expect(isMercadoPagoCheckoutReference(a)).toBe(true);
		expect(parsePayPalCustomId(fromMercadoPagoReference(a))).toEqual({
			kind: "onboarding",
			applicationId: "0b6f1c2e-9a3d-4e5f-8a7b-1c2d3e4f5a6b",
			chargedMonths: 12,
			grantedMonths: 24,
			promoApplied: true,
		});
	});

	it("reconoce las referencias de checkout y nada más", () => {
		expect(isMercadoPagoCheckoutReference("3751385378-4d78444f-87fb-4ab4-878d-b484e6c987dd")).toBe(false);
		expect(isMercadoPagoCheckoutReference("manual-a1-1")).toBe(false);
		expect(isMercadoPagoCheckoutReference("ob_x?y")).toBe(false);
		expect(isMercadoPagoCheckoutReference(null)).toBe(false);
	});
});

describe("estado del pago", () => {
	it("solo `approved` es cobro; rechazado, cancelado o devuelto hay que volver a pagar", () => {
		expect(mercadoPagoPaymentState({ status: "approved" })).toBe("paid");
		for (const status of ["pending", "in_process", "authorized", "in_mediation", ""]) {
			expect(mercadoPagoPaymentState({ status })).toBe("pending");
		}
		for (const status of ["rejected", "cancelled", "refunded", "charged_back"]) {
			expect(mercadoPagoPaymentState({ status })).toBe("failed");
		}
	});

	it("valida el formato de los ids que llegan por URL", () => {
		expect(isMercadoPagoNumericId(PAYMENT_ID)).toBe(true);
		expect(isMercadoPagoNumericId("12/../x")).toBe(false);
		expect(isMercadoPagoNumericId("null")).toBe(false);
		expect(isMercadoPagoNumericId("")).toBe(false);
		expect(isMercadoPagoNumericId(null)).toBe(false);
	});
});

describe("verifyMercadoPagoSignature", () => {
	it("acepta la firma de Mercado Pago (id en minúsculas en el manifest)", () => {
		const signatureHeader = sign(ORDER_ID, "req-1");
		expect(verifyMercadoPagoSignature({ signatureHeader, requestId: "req-1", dataId: ORDER_ID })).toEqual({ ok: true });
	});

	it("omite del manifest lo que no llega", () => {
		const ts = "1742505638683";
		const signatureHeader = `ts=${ts},v1=${createHmac("sha256", SECRET).update(`ts:${ts};`).digest("hex")}`;
		expect(verifyMercadoPagoSignature({ signatureHeader, requestId: null, dataId: null })).toEqual({ ok: true });
	});

	it("rechaza otra clave, otro id o una cabecera incompleta", () => {
		expect(verifyMercadoPagoSignature({ signatureHeader: sign(ORDER_ID, "req-1", undefined, "b".repeat(64)), requestId: "req-1", dataId: ORDER_ID })).toEqual({ ok: false, reason: "invalid" });
		expect(verifyMercadoPagoSignature({ signatureHeader: sign(ORDER_ID, "req-1"), requestId: "req-1", dataId: "ORD99" })).toEqual({ ok: false, reason: "invalid" });
		expect(verifyMercadoPagoSignature({ signatureHeader: "ts=1", requestId: "req-1", dataId: ORDER_ID })).toEqual({ ok: false, reason: "missing" });
	});

	it("sin clave configurada falla cerrado", () => {
		vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
		expect(verifyMercadoPagoSignature({ signatureHeader: sign(ORDER_ID, "req-1"), requestId: "req-1", dataId: ORDER_ID })).toEqual({ ok: false, reason: "not_configured" });
	});
});

describe("POST /api/payments/mercadopago/webhook", () => {
	it("sin clave responde 503 y no toca nada", async () => {
		vi.stubEnv("MERCADOPAGO_WEBHOOK_SECRET", "");
		const res = await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }));
		expect(res.status).toBe(503);
		expect(capture).not.toHaveBeenCalled();
	});

	it("firma inválida: 401", async () => {
		const res = await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign("999", "req-1") }));
		expect(res.status).toBe(401);
		expect(capture).not.toHaveBeenCalled();
	});

	it("aviso firmado de un pago: confirma el pago contra Mercado Pago", async () => {
		capture.mockResolvedValue({ ok: true, ref: "ob_app-1_1_1_0_abc" });
		const res = await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, outcome: "applied" });
		expect(capture).toHaveBeenCalledWith({ supabaseAdmin: { tag: "admin" }, paymentId: PAYMENT_ID });
	});

	it("otros tópicos y pagos que no son de un alta se ignoran", async () => {
		const res = await POST(webhookRequest({ dataId: "123", type: "merchant_order", signature: sign("123", "req-1") }));
		expect(await res.json()).toEqual({ ok: true, ignored: true });
		expect(capture).not.toHaveBeenCalled();
		capture.mockResolvedValueOnce({ ok: false, reason: "ignored", error: "x", status: 400 });
		const res2 = await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }));
		expect(await res2.json()).toEqual({ ok: true, ignored: true });
	});

	it("si Mercado Pago no respondió pide reintento; si aún no está cobrado, no", async () => {
		capture.mockResolvedValueOnce({ ok: false, reason: "pending", error: "x", status: 502 });
		expect((await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }))).status).toBe(503);
		capture.mockResolvedValueOnce({ ok: false, reason: "pending", error: "x", status: 409 });
		expect((await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }))).status).toBe(200);
	});
});
