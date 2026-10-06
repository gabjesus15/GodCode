import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const applyCompleted = vi.fn();
vi.mock("@/lib/billing/portal-paypal", () => ({
	applyCompletedPortalPayPalOrder: (...args: unknown[]) => applyCompleted(...args),
}));
const applyOnboarding = vi.fn();
vi.mock("@/lib/onboarding/paypal-onboarding", () => ({
	applyOnboardingPayPalWebhook: (...args: unknown[]) => applyOnboarding(...args),
}));
vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: { tag: "admin" } }));

import { captureEventOrderId, verifyPayPalWebhookSignature } from "@/lib/payments/paypal-webhook";
import { POST } from "@/app/api/payments/paypal/webhook/route";

const SIGNATURE_HEADERS = {
	"paypal-auth-algo": "SHA256withRSA",
	"paypal-cert-url": "https://api.paypal.com/cert.pem",
	"paypal-transmission-id": "tx-1",
	"paypal-transmission-sig": "sig",
	"paypal-transmission-time": "2026-10-01T00:00:00Z",
};

// Número con formato que JSON.stringify no conservaría: la firma es sobre estos bytes.
const RAW_EVENT =
	'{"id":"WH-1","event_type":"PAYMENT.CAPTURE.COMPLETED","resource":{"amount":{"value":"10.50"},"x":1.0,"supplementary_data":{"related_ids":{"order_id":"ORDER-9"}}}}';

function paypalFetch(verificationStatus: string) {
	const calls: Array<{ url: string; body: string }> = [];
	const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
		calls.push({ url: String(url), body: String(init?.body ?? "") });
		if (String(url).endsWith("/v1/oauth2/token")) {
			return new Response(JSON.stringify({ access_token: "tok" }), { status: 200 });
		}
		return new Response(JSON.stringify({ verification_status: verificationStatus }), { status: 200 });
	});
	return { impl: impl as unknown as typeof fetch, calls };
}

function webhookRequest(body = RAW_EVENT, headers: Record<string, string> = SIGNATURE_HEADERS) {
	return new NextRequest("http://localhost/api/payments/paypal/webhook", { method: "POST", body, headers });
}

beforeEach(() => {
	vi.stubEnv("PAYPAL_CLIENT_ID", "id");
	vi.stubEnv("PAYPAL_CLIENT_SECRET", "secret");
	vi.stubEnv("PAYPAL_WEBHOOK_ID", "WH-CONFIG");
	applyCompleted.mockReset();
	applyOnboarding.mockReset();
});
afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe("verifyPayPalWebhookSignature", () => {
	it("sin PAYPAL_WEBHOOK_ID falla cerrado sin llamar a PayPal", async () => {
		vi.stubEnv("PAYPAL_WEBHOOK_ID", "");
		const { impl } = paypalFetch("SUCCESS");
		const result = await verifyPayPalWebhookSignature(RAW_EVENT, new Headers(SIGNATURE_HEADERS), impl);
		expect(result).toEqual({ ok: false, reason: "not_configured" });
		expect(impl).not.toHaveBeenCalled();
	});

	it("sin las cabeceras de firma no pregunta a PayPal", async () => {
		const { impl } = paypalFetch("SUCCESS");
		const result = await verifyPayPalWebhookSignature(RAW_EVENT, new Headers(), impl);
		expect(result).toEqual({ ok: false, reason: "missing_headers" });
		expect(impl).not.toHaveBeenCalled();
	});

	it("manda el evento con sus bytes originales y el id del webhook configurado", async () => {
		const { impl, calls } = paypalFetch("SUCCESS");
		const result = await verifyPayPalWebhookSignature(RAW_EVENT, new Headers(SIGNATURE_HEADERS), impl);
		expect(result).toEqual({ ok: true });
		const verify = calls.find((c) => c.url.endsWith("/v1/notifications/verify-webhook-signature"))!;
		expect(new URL(verify.url).origin).toBe("https://api-m.sandbox.paypal.com");
		expect(verify.body.endsWith(`"webhook_event":${RAW_EVENT}}`)).toBe(true);
		const parsed = JSON.parse(verify.body) as Record<string, unknown>;
		expect(parsed).toMatchObject({ webhook_id: "WH-CONFIG", transmission_id: "tx-1", auth_algo: "SHA256withRSA" });
	});

	it("una firma que PayPal no reconoce es inválida", async () => {
		const { impl } = paypalFetch("FAILURE");
		const result = await verifyPayPalWebhookSignature(RAW_EVENT, new Headers(SIGNATURE_HEADERS), impl);
		expect(result).toEqual({ ok: false, reason: "invalid_signature" });
	});

	it("lee la orden de la captura", () => {
		expect(captureEventOrderId(JSON.parse(RAW_EVENT))).toBe("ORDER-9");
		expect(captureEventOrderId({ resource: {} })).toBeNull();
	});
});

describe("POST /api/payments/paypal/webhook", () => {
	it("sin PAYPAL_WEBHOOK_ID responde 503 y no aplica nada", async () => {
		vi.stubEnv("PAYPAL_WEBHOOK_ID", "");
		const res = await POST(webhookRequest());
		expect(res.status).toBe(503);
		expect(applyCompleted).not.toHaveBeenCalled();
	});

	it("con firma inválida responde 401 y no aplica nada", async () => {
		vi.stubGlobal("fetch", paypalFetch("FAILURE").impl);
		const res = await POST(webhookRequest());
		expect(res.status).toBe(401);
		expect(applyCompleted).not.toHaveBeenCalled();
	});

	it("con firma válida aplica la orden de la captura", async () => {
		vi.stubGlobal("fetch", paypalFetch("SUCCESS").impl);
		applyCompleted.mockResolvedValue({ outcome: "applied" });
		const res = await POST(webhookRequest());
		expect(res.status).toBe(200);
		expect(applyCompleted).toHaveBeenCalledWith({ supabaseAdmin: { tag: "admin" }, orderId: "ORDER-9" });
	});

	it("si PayPal todavía no da la orden por cobrada, pide reintento", async () => {
		vi.stubGlobal("fetch", paypalFetch("SUCCESS").impl);
		applyCompleted.mockResolvedValue({ outcome: "retry", reason: "order_not_completed" });
		const res = await POST(webhookRequest());
		expect(res.status).toBe(503);
	});

	it("ignora otros eventos", async () => {
		vi.stubGlobal("fetch", paypalFetch("SUCCESS").impl);
		const res = await POST(webhookRequest('{"id":"WH-2","event_type":"PAYMENT.CAPTURE.REFUNDED","resource":{}}'));
		expect(res.status).toBe(200);
		expect(applyCompleted).not.toHaveBeenCalled();
	});

	it("una captura que no es del portal se aplica como alta", async () => {
		vi.stubGlobal("fetch", paypalFetch("SUCCESS").impl);
		applyCompleted.mockResolvedValue({ outcome: "ignored", reason: "not_portal_order" });
		applyOnboarding.mockResolvedValue({ outcome: "applied" });
		const res = await POST(webhookRequest());
		expect(res.status).toBe(200);
		expect(applyOnboarding).toHaveBeenCalledWith({ supabaseAdmin: { tag: "admin" }, orderId: "ORDER-9" });
	});

	it("una orden aprobada (cerró la pestaña antes de volver) se cobra como alta", async () => {
		vi.stubGlobal("fetch", paypalFetch("SUCCESS").impl);
		applyOnboarding.mockResolvedValue({ outcome: "applied" });
		const res = await POST(webhookRequest('{"id":"WH-3","event_type":"CHECKOUT.ORDER.APPROVED","resource":{"id":"ORDER-7"}}'));
		expect(res.status).toBe(200);
		expect(applyOnboarding).toHaveBeenCalledWith({ supabaseAdmin: { tag: "admin" }, orderId: "ORDER-7" });
		expect(applyCompleted).not.toHaveBeenCalled();
	});

	it("si PayPal no responde al cobrar el alta, pide reintento", async () => {
		vi.stubGlobal("fetch", paypalFetch("SUCCESS").impl);
		applyOnboarding.mockResolvedValue({ outcome: "retry", reason: "paypal_unavailable" });
		const res = await POST(webhookRequest('{"id":"WH-4","event_type":"CHECKOUT.ORDER.APPROVED","resource":{"id":"ORDER-7"}}'));
		expect(res.status).toBe(503);
	});
});
