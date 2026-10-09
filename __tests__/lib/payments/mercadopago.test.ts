import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
const paymentOrderId = vi.hoisted(() => vi.fn());
vi.mock("@/lib/onboarding/mercadopago-onboarding", () => ({
	captureOnboardingMercadoPagoOrder: (...args: unknown[]) => capture(...args),
}));
vi.mock("@/lib/payments/mercadopago", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/payments/mercadopago")>()),
	getMercadoPagoPaymentOrderId: (...args: unknown[]) => paymentOrderId(...args),
}));
vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: { tag: "admin" } }));

import {
	fromMercadoPagoReference,
	isMercadoPagoNumericId,
	isMercadoPagoPreferenceId,
	mercadoPagoOrderState,
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
	paymentOrderId.mockReset();
	paymentOrderId.mockResolvedValue(ORDER_ID);
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
});

describe("estado de la merchant order", () => {
	const order = { orderStatus: "paid", totalAmount: 18050, paidAmount: 18050, paymentStatuses: ["approved"] };

	it("solo cuenta como pagada si se cobró el total", () => {
		expect(mercadoPagoOrderState(order)).toBe("paid");
		expect(mercadoPagoOrderState({ ...order, orderStatus: "partially_paid", paidAmount: 9000 })).toBe("pending");
		expect(mercadoPagoOrderState({ ...order, orderStatus: "payment_in_process", paidAmount: 0, paymentStatuses: ["in_process"] })).toBe("pending");
		expect(mercadoPagoOrderState({ ...order, orderStatus: "payment_required", paidAmount: 0, paymentStatuses: [] })).toBe("pending");
	});

	it("vencida o con todos los pagos rechazados hay que volver a pagarla", () => {
		expect(mercadoPagoOrderState({ ...order, orderStatus: "expired", paidAmount: 0, paymentStatuses: [] })).toBe("failed");
		expect(mercadoPagoOrderState({ ...order, orderStatus: "payment_required", paidAmount: 0, paymentStatuses: ["rejected", "cancelled"] })).toBe("failed");
		expect(mercadoPagoOrderState({ ...order, orderStatus: "payment_required", paidAmount: 0, paymentStatuses: ["rejected", "in_process"] })).toBe("pending");
	});

	it("valida el formato de los ids que llegan por URL", () => {
		expect(isMercadoPagoNumericId(ORDER_ID)).toBe(true);
		expect(isMercadoPagoNumericId("12/../x")).toBe(false);
		expect(isMercadoPagoNumericId("")).toBe(false);
		expect(isMercadoPagoNumericId(null)).toBe(false);
		expect(isMercadoPagoPreferenceId("3751385378-4d78444f-87fb-4ab4-878d-b484e6c987dd")).toBe(true);
		expect(isMercadoPagoPreferenceId("x?y")).toBe(false);
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

	it("aviso firmado de un pago: confirma su merchant order contra Mercado Pago", async () => {
		capture.mockResolvedValue({ ok: true, ref: "pref-1" });
		const res = await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }));
		expect(res.status).toBe(200);
		expect(paymentOrderId).toHaveBeenCalledWith(PAYMENT_ID);
		expect(capture).toHaveBeenCalledWith({ supabaseAdmin: { tag: "admin" }, merchantOrderId: ORDER_ID });
	});

	it("otros tópicos y pagos sin orden se ignoran", async () => {
		const res = await POST(webhookRequest({ dataId: "123", type: "merchant_order", signature: sign("123", "req-1") }));
		expect(await res.json()).toEqual({ ok: true, ignored: true });
		paymentOrderId.mockResolvedValueOnce(null);
		const res2 = await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }));
		expect(await res2.json()).toEqual({ ok: true, ignored: true });
		expect(capture).not.toHaveBeenCalled();
	});

	it("si Mercado Pago no respondió pide reintento; si aún no está cobrada, no", async () => {
		paymentOrderId.mockResolvedValueOnce(undefined);
		expect((await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }))).status).toBe(503);
		capture.mockResolvedValueOnce({ ok: false, reason: "pending", error: "x", status: 502 });
		expect((await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }))).status).toBe(503);
		capture.mockResolvedValueOnce({ ok: false, reason: "pending", error: "x", status: 409 });
		expect((await POST(webhookRequest({ dataId: PAYMENT_ID, signature: sign(PAYMENT_ID, "req-1") }))).status).toBe(200);
	});
});
