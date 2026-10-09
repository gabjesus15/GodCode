import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));
const isRateLimited = vi.fn(async (_key: string, _limit: number, _windowMs: number) => false);
vi.mock("@/lib/onboarding/rate-limit", () => ({
	isRateLimited: (key: string, limit: number, windowMs: number) => isRateLimited(key, limit, windowMs),
}));
type HelperResult = { ok: true; email: string } | { ok: false; error: string; status: number };
const setOwnerFirstPassword = vi.fn(async (..._args: unknown[]): Promise<HelperResult> => ({ ok: true, email: "dueno@local.com" }));
vi.mock("@/lib/onboarding/owner-first-password", () => ({
	setOwnerFirstPassword: (...args: unknown[]) => setOwnerFirstPassword(...args),
}));

import { POST } from "@/services/onboarding-billing/app/api/onboarding/set-password/route";

function setPassword(body: Record<string, unknown>) {
	return POST(
		new NextRequest("http://localhost/api/onboarding/set-password", {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
			body: JSON.stringify(body),
		}),
	);
}

const VALID = { ref: "ORDER-1", token: "tok-123", password: "clave-segura" };

beforeEach(() => {
	isRateLimited.mockReset();
	isRateLimited.mockResolvedValue(false);
	setOwnerFirstPassword.mockReset();
	setOwnerFirstPassword.mockResolvedValue({ ok: true, email: "dueno@local.com" });
});

describe("POST /api/onboarding/set-password", () => {
	it("con todo en orden devuelve el correo para entrar", async () => {
		const res = await setPassword(VALID);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, email: "dueno@local.com" });
		expect(setOwnerFirstPassword).toHaveBeenCalledWith(expect.anything(), {
			paymentReference: "ORDER-1",
			verificationToken: "tok-123",
			password: "clave-segura",
		});
	});

	it("sin referencia o token válidos responde missing_link", async () => {
		const res = await setPassword({ ...VALID, ref: "no válida" });
		expect(res.status).toBe(400);
		expect(await res.json()).toMatchObject({ code: "missing_link" });
		expect(setOwnerFirstPassword).not.toHaveBeenCalled();
	});

	it("con el límite alcanzado responde rate_limited", async () => {
		isRateLimited.mockResolvedValue(true);
		const res = await setPassword(VALID);
		expect(res.status).toBe(429);
		expect(await res.json()).toMatchObject({ code: "rate_limited" });
		expect(setOwnerFirstPassword).not.toHaveBeenCalled();
	});

	it("una contraseña fuera de largo responde invalid_password sin tocar la cuenta", async () => {
		for (const password of ["corta", "x".repeat(73)]) {
			const res = await setPassword({ ...VALID, password });
			expect(res.status).toBe(400);
			expect(await res.json()).toMatchObject({ code: "invalid_password" });
		}
		expect(setOwnerFirstPassword).not.toHaveBeenCalled();
	});

	it("traduce cada respuesta del helper a un código estable", async () => {
		const cases: Array<[number, string]> = [
			[404, "not_found"],
			[409, "already_used"],
			[410, "expired"],
			[400, "password_rejected"],
			[500, "server_error"],
		];
		for (const [status, code] of cases) {
			setOwnerFirstPassword.mockResolvedValueOnce({ ok: false, error: "texto del helper", status });
			const res = await setPassword(VALID);
			expect(res.status, code).toBe(status);
			expect(await res.json(), code).toEqual({ code, error: "texto del helper" });
		}
	});

	it("si algo revienta responde server_error", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
		setOwnerFirstPassword.mockRejectedValueOnce(new Error("se cayó la base"));
		const res = await setPassword(VALID);
		expect(res.status).toBe(500);
		expect(await res.json()).toMatchObject({ code: "server_error" });
		consoleError.mockRestore();
	});
});
