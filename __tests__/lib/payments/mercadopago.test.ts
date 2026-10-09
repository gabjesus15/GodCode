import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const capture = vi.fn();
vi.mock("@/lib/onboarding/mercadopago-onboarding", () => ({
	captureOnboardingMercadoPagoOrder: (...args: unknown[]) => capture(...args),
}));
vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: { tag: "admin" } }));

import {
	fromMercadoPagoReference,
	isMercadoPagoOrderId,
	mercadoPagoOrderState,
	parseUsdClpRate,
	toClp,
	toMercadoPagoReference,
	verifyMercadoPagoSignature,
} from "@/lib/payments/mercadopago";
import { POST } from "@/app/api/payments/mercadopago/webhook/route";

const SECRET = "a".repeat(64);
const ORDER_ID = "ORD01M28P44G5FG8RJPM579EH56FV";

/** Firma como la calcula Mercado Pago: el id va en minúsculas en el manifest. */
function sign(dataId: string, requestId: string, ts = "1742505638683", secret = SECRET) {
	const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
	return `ts=${ts},v1=${createHmac("sha256", secret).update(manifest).digest("hex")}`;
}

function webhookRequest(params: { dataId?: string; type?: string; signature?: string; requestId?: string }) {
	const query = new URLSearchParams();
	if (params.dataId) query.set("data.id", params.dataId);
	query.set("type", params.type ?? "order");
	const headers: Record<string, string> = { "x-request-id": params.requestId ?? "req-1" };
	if (params.signature) headers["x-signature"] = params.signature;
	return new NextRequest(`http://localhost/api/payments/mercadopago/webhook?${query}`, {
		method: "POST",
		headers,
		body: JSON.stringify({ action: "order.processed", type: params.type ?? "order", data: { id: params.dataId } }),
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
});

describe("estado de la orden", () => {
	const order = { status: "processed", statusDetail: "accredited", totalAmount: 18050, totalPaidAmount: 18050 };

	it("solo cuenta como pagada si se procesó y se cobró el total", () => {
		expect(mercadoPagoOrderState(order)).toBe("paid");
		expect(mercadoPagoOrderState({ ...order, totalPaidAmount: 9000 })).toBe("pending");
		expect(mercadoPagoOrderState({ ...order, status: "action_required", totalPaidAmount: 0 })).toBe("pending");
		expect(mercadoPagoOrderState({ ...order, status: "created", totalPaidAmount: 0 })).toBe("pending");
	});

	it("fallida, vencida o cancelada hay que volver a pagarla", () => {
		for (const status of ["failed", "expired", "canceled", "refunded"]) {
			expect(mercadoPagoOrderState({ ...order, status })).toBe("failed");
		}
	});

	it("valida el formato del id que llega por URL", () => {
		expect(isMercadoPagoOrderId(ORDER_ID)).toBe(true);
		expect(isMercadoPagoOrderId("ORD-1/../x")).toBe(false);
		expect(isMercadoPagoOrderId("")).toBe(false);
		expect(isMercadoPagoOrderId(null)).toBe(false);
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
		const res = await POST(webhookRequest({ dataId: ORDER_ID, signature: sign(ORDER_ID, "req-1") }));
		expect(res.status).toBe(503);
		expect(capture).not.toHaveBeenCalled();
	});

	it("firma inválida: 401", async () => {
		const res = await POST(webhookRequest({ dataId: ORDER_ID, signature: sign("ORD-OTRA", "req-1") }));
		expect(res.status).toBe(401);
		expect(capture).not.toHaveBeenCalled();
	});

	it("aviso firmado de una orden: la confirma contra Mercado Pago", async () => {
		capture.mockResolvedValue({ ok: true, ref: ORDER_ID });
		const res = await POST(webhookRequest({ dataId: ORDER_ID, signature: sign(ORDER_ID, "req-1") }));
		expect(res.status).toBe(200);
		expect(capture).toHaveBeenCalledWith({ supabaseAdmin: { tag: "admin" }, orderId: ORDER_ID });
	});

	it("otros tópicos se ignoran", async () => {
		const res = await POST(webhookRequest({ dataId: "123", type: "payment", signature: sign("123", "req-1") }));
		expect(await res.json()).toEqual({ ok: true, ignored: true });
		expect(capture).not.toHaveBeenCalled();
	});

	it("si Mercado Pago no respondió pide reintento; si aún no está cobrada, no", async () => {
		capture.mockResolvedValueOnce({ ok: false, reason: "pending", error: "x", status: 502 });
		expect((await POST(webhookRequest({ dataId: ORDER_ID, signature: sign(ORDER_ID, "req-1") }))).status).toBe(503);
		capture.mockResolvedValueOnce({ ok: false, reason: "pending", error: "x", status: 409 });
		expect((await POST(webhookRequest({ dataId: ORDER_ID, signature: sign(ORDER_ID, "req-1") }))).status).toBe(200);
	});
});
