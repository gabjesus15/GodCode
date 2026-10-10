import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));
const isRateLimited = vi.fn(async (_key: string, _limit: number, _windowMs: number) => false);
vi.mock("@/lib/onboarding/rate-limit", () => ({
	isRateLimited: (key: string, limit: number, windowMs: number) => isRateLimited(key, limit, windowMs),
}));
const sendOnboardingResumeLink = vi.fn();
vi.mock("@/lib/onboarding/resume-application", () => ({
	sendOnboardingResumeLink: (...args: unknown[]) => sendOnboardingResumeLink(...args),
}));

import { RESEND_ERROR_CODES } from "@/lib/onboarding/onboarding-ui-copy";
import { POST } from "@/services/onboarding-billing/app/api/onboarding/resend-verification/route";

function resend(body: Record<string, unknown> = { email: "Dueno@Local.com " }) {
	return POST(
		new NextRequest("http://localhost/api/onboarding/resend-verification", {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
			body: JSON.stringify(body),
		}),
	);
}

async function expectFailure(res: Response, status: number, code: string) {
	expect(res.status).toBe(status);
	const body = (await res.json()) as { code?: string; error?: string };
	expect(body.code).toBe(code);
	expect(RESEND_ERROR_CODES as readonly string[]).toContain(body.code);
	// El texto en español sigue, para el log y para clientes viejos.
	expect(body.error?.trim()).toBeTruthy();
}

beforeEach(() => {
	isRateLimited.mockReset();
	isRateLimited.mockResolvedValue(false);
	sendOnboardingResumeLink.mockReset();
	sendOnboardingResumeLink.mockResolvedValue({ found: true, target: "verify", email: { status: "sent" } });
});

describe("POST /api/onboarding/resend-verification", () => {
	it("con un alta, manda el enlace al correo normalizado", async () => {
		const res = await resend();
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true });
		expect(sendOnboardingResumeLink).toHaveBeenCalledWith(expect.anything(), "dueno@local.com");
	});

	it("sin alta con ese correo responde lo mismo: no delata qué correos están registrados", async () => {
		const withApplication = await (await resend()).json();
		sendOnboardingResumeLink.mockResolvedValue({ found: false });
		const res = await resend();
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(withApplication);
	});

	it("sin correo responde email_invalid sin buscar nada", async () => {
		await expectFailure(await resend({ email: "   " }), 400, "email_invalid");
		expect(sendOnboardingResumeLink).not.toHaveBeenCalled();
	});

	it("con el límite alcanzado responde rate_limited", async () => {
		isRateLimited.mockResolvedValue(true);
		await expectFailure(await resend(), 429, "rate_limited");
		expect(sendOnboardingResumeLink).not.toHaveBeenCalled();
	});

	it("si el correo no sale responde email_not_sent", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		sendOnboardingResumeLink.mockResolvedValue({ found: true, target: "verify", email: { status: "failed", error: "resend down" } });
		await expectFailure(await resend(), 502, "email_not_sent");
		error.mockRestore();
	});

	it("un correo que ya había salido hace poco cuenta como enviado", async () => {
		sendOnboardingResumeLink.mockResolvedValue({ found: true, target: "verify", email: { status: "duplicate" } });
		const res = await resend();
		expect(res.status).toBe(200);
	});

	it("si algo se rompe responde server_error y lo deja en el log", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		sendOnboardingResumeLink.mockRejectedValue(new Error("sin base"));
		await expectFailure(await resend(), 500, "server_error");
		expect(error).toHaveBeenCalled();
		error.mockRestore();
	});
});
