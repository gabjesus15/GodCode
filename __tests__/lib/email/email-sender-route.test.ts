import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

type Ctx = { companyId: string; email: string; role: string };

const holder = {
	ctx: null as Ctx | null,
	customDomain: "oishisushi.shop" as string | null,
	rateLimited: false,
};

const saveCompanySender = vi.fn(async (..._args: unknown[]) => ({ ok: true as const }));
const deleteCompanySender = vi.fn(async (..._args: unknown[]) => undefined);
const getCompanySender = vi.fn(async (..._args: unknown[]) => null);
const getCompanyEffectiveDomain = vi.fn(async (..._args: unknown[]) => ({
	found: true as const,
	customDomain: holder.customDomain,
}));

vi.mock("@/lib/email/company-sender", () => ({
	saveCompanySender: (...args: unknown[]) => saveCompanySender(...args),
	deleteCompanySender: (...args: unknown[]) => deleteCompanySender(...args),
	getCompanySender: (...args: unknown[]) => getCompanySender(...args),
	getCompanyEffectiveDomain: (...args: unknown[]) => getCompanyEffectiveDomain(...args),
}));
vi.mock("@/lib/tenant/customer-account-rate-limit", () => ({
	assertCustomerAccountRateLimit: vi.fn(async () =>
		holder.rateLimited ? NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 }) : null,
	),
}));
vi.mock("@/lib/tenant/customer-account-context", () => ({
	getCustomerAccountContext: vi.fn(async () => holder.ctx),
}));

import { DELETE, GET, PUT } from "@/app/api/customer-account/email-sender/route";

const CEO: Ctx = { companyId: "acme", email: "ceo@acme.cl", role: "ceo" };

function put(body: Record<string, unknown>) {
	return PUT(
		new NextRequest("http://localhost/api/customer-account/email-sender", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		}),
	);
}

/** El Resend propio de los cupones lo configura el CEO desde su cuenta, solo para su empresa. */
describe("/api/customer-account/email-sender", () => {
	beforeEach(() => {
		holder.ctx = { ...CEO };
		holder.customDomain = "oishisushi.shop";
		holder.rateLimited = false;
		saveCompanySender.mockClear();
		deleteCompanySender.mockClear();
		getCompanyEffectiveDomain.mockClear();
	});

	it("sin sesión de CEO responde 401 y no toca nada", async () => {
		holder.ctx = null;
		expect((await GET()).status).toBe(401);
		expect((await put({ fromEmail: "cupones@oishisushi.shop" })).status).toBe(401);
		expect((await DELETE()).status).toBe(401);
		expect(saveCompanySender).not.toHaveBeenCalled();
		expect(deleteCompanySender).not.toHaveBeenCalled();
	});

	it("un rol que no es CEO recibe 403", async () => {
		holder.ctx = { ...CEO, role: "admin" };
		expect((await put({ fromEmail: "cupones@oishisushi.shop" })).status).toBe(403);
		expect(saveCompanySender).not.toHaveBeenCalled();
	});

	it("GET devuelve el dominio vigente y el remitente de la propia empresa", async () => {
		const res = await GET();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ customDomain: "oishisushi.shop", sender: null });
		expect(getCompanyEffectiveDomain).toHaveBeenCalledWith("acme");
	});

	it("sin dominio propio vigente no deja guardar", async () => {
		holder.customDomain = null;
		const res = await put({ apiKey: "re_12345678", fromEmail: "cupones@oishisushi.shop" });
		expect(res.status).toBe(400);
		expect(saveCompanySender).not.toHaveBeenCalled();
	});

	it("guarda para la empresa de la sesión y manda la prueba al CEO, aunque el cuerpo diga otra empresa", async () => {
		const res = await put({
			companyId: "otra-empresa",
			apiKey: "re_12345678",
			fromEmail: "cupones@oishisushi.shop",
			fromName: "Oishi Sushi",
			replyTo: "hola@oishisushi.shop",
		});

		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, testSentTo: "ceo@acme.cl" });
		expect(saveCompanySender).toHaveBeenCalledWith({
			companyId: "acme",
			apiKey: "re_12345678",
			fromEmail: "cupones@oishisushi.shop",
			fromName: "Oishi Sushi",
			replyTo: "hola@oishisushi.shop",
			testTo: "ceo@acme.cl",
			actorEmail: "ceo@acme.cl",
		});
	});

	it("pasa el error de Resend con su código", async () => {
		saveCompanySender.mockResolvedValueOnce({ ok: false, status: 400, error: "Resend no envió la prueba: domain not verified" } as never);
		const res = await put({ apiKey: "re_12345678", fromEmail: "cupones@oishisushi.shop" });
		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "Resend no envió la prueba: domain not verified" });
	});

	it("DELETE quita solo el remitente de la propia empresa", async () => {
		const res = await DELETE();
		expect(res.status).toBe(200);
		expect(deleteCompanySender).toHaveBeenCalledWith("acme");
	});

	it("respeta el límite de pedidos (cada guardado manda un correo)", async () => {
		holder.rateLimited = true;
		expect((await put({ apiKey: "re_12345678", fromEmail: "cupones@oishisushi.shop" })).status).toBe(429);
		expect((await DELETE()).status).toBe(429);
		expect(saveCompanySender).not.toHaveBeenCalled();
		expect(deleteCompanySender).not.toHaveBeenCalled();
	});
});
