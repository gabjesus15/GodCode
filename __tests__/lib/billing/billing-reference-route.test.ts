import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { privateReceiptHref } from "@/lib/storage/private-receipts";

import { makeAdminMock } from "../menu-account/test-supabase-mock";

const submitPortalReceipt = vi.fn(async (..._args: unknown[]) => ({ ok: true as const, order: null }));

vi.mock("@/lib/infra/supabase-admin", () => ({
	supabaseAdmin: makeAdminMock({ tables: { companies: [{ data: { country: "CL" }, error: null }] } }),
}));
vi.mock("@/lib/billing/portal-billing", () => ({
	submitPortalReceipt: (...args: unknown[]) => submitPortalReceipt(...args),
}));
vi.mock("@/lib/email/account-notices", () => ({ notifyPortalReceipt: vi.fn(async () => undefined) }));
vi.mock("@/lib/tenant/customer-account-rate-limit", () => ({
	assertCustomerAccountRateLimit: vi.fn(async () => null),
}));
vi.mock("@/lib/tenant/customer-account-context", () => ({
	getCustomerAccountContext: vi.fn(async () => ({ companyId: "acme" })),
}));

import { POST } from "@/app/api/customer-account/billing/reference/route";

const FILE_ID = "11111111-1111-4111-8111-111111111111";

function post(referenceFileUrl: string) {
	return POST(
		new NextRequest("http://localhost/api/customer-account/billing/reference", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ paymentId: "p1", referenceFileUrl, methodSlug: "transferencia" }),
		}),
	);
}

/** El enlace guardado lo abre el equipo: solo puede apuntar a un comprobante privado de la misma empresa. */
describe("POST /api/customer-account/billing/reference", () => {
	beforeEach(() => submitPortalReceipt.mockClear());

	it("acepta el enlace privado de un comprobante de la propia empresa", async () => {
		const href = privateReceiptHref(`platform/payment-reference/acme/${FILE_ID}.jpg`);
		const res = await post(href);
		expect(res.status).toBe(200);
		expect(submitPortalReceipt).toHaveBeenCalledWith(expect.objectContaining({ referenceFileUrl: href }));
	});

	it("rechaza el comprobante de otra empresa", async () => {
		const res = await post(privateReceiptHref(`platform/payment-reference/otra/${FILE_ID}.jpg`));
		expect(res.status).toBe(400);
		expect(submitPortalReceipt).not.toHaveBeenCalled();
	});

	it("rechaza URLs públicas y enlaces externos", async () => {
		expect((await post("https://sb.example/storage/v1/object/public/menu/uploads/x.jpg")).status).toBe(400);
		expect((await post("https://evil.example/x.jpg")).status).toBe(400);
		expect(submitPortalReceipt).not.toHaveBeenCalled();
	});
});
