import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** Respuestas de la base para esta petición: el insert (una o más veces) y el plan sugerido. */
const db: { inserts: Array<{ data: unknown; error: unknown }>; plan: unknown; insertedRows: Array<Record<string, unknown>> } = {
	inserts: [],
	plan: null,
	insertedRows: [],
};

vi.mock("@/lib/infra/supabase-admin", () => ({
	supabaseAdmin: {
		from: (table: string) => {
			const query: Record<string, unknown> = {};
			for (const method of ["select", "eq"]) query[method] = () => query;
			query.insert = (row: Record<string, unknown>) => {
				db.insertedRows.push(row);
				return query;
			};
			query.single = async () => db.inserts.shift() ?? { data: { id: "app-1" }, error: null };
			query.maybeSingle = async () => ({ data: table === "plans" ? db.plan : null, error: null });
			return query;
		},
	},
}));
const verifyRecaptcha = vi.fn(async (..._args: unknown[]): Promise<{ ok: boolean; error?: string; score?: number; action?: string }> => ({ ok: true }));
vi.mock("@/lib/onboarding/recaptcha", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/onboarding/recaptcha")>()),
	verifyRecaptcha: (...args: unknown[]) => verifyRecaptcha(...args),
}));
const isRateLimited = vi.fn(async (_key: string, _limit: number, _windowMs: number) => false);
vi.mock("@/lib/onboarding/rate-limit", () => ({
	isRateLimited: (key: string, limit: number, windowMs: number) => isRateLimited(key, limit, windowMs),
}));
vi.mock("@/lib/onboarding/team-alerts", () => ({ alertOnboardingTeam: async () => undefined }));
const sendEmail = vi.fn(async (_input: unknown) => ({ status: "sent" as const }));
vi.mock("@/lib/email/send", () => ({ sendEmail: (input: unknown) => sendEmail(input), teamInbox: () => null }));
const sendOnboardingResumeLink = vi.fn();
vi.mock("@/lib/onboarding/resume-application", () => ({
	sendOnboardingResumeLink: (...args: unknown[]) => sendOnboardingResumeLink(...args),
}));

import { logger } from "@/lib/infra/logger";
import { APPLY_ERROR_CODES } from "@/lib/onboarding/onboarding-ui-copy";
import { POST } from "@/services/onboarding-billing/app/api/onboarding/apply/route";

function apply(extra: Record<string, unknown> = {}) {
	return POST(
		new NextRequest("http://localhost/api/onboarding/apply", {
			method: "POST",
			headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.1" },
			body: JSON.stringify({
				business_name: "Rica Pizza",
				responsible_name: "Ana Pérez",
				email: "dueno@local.com",
				terms_accepted: true,
				privacy_accepted: true,
				recaptcha_token: "ok",
				...extra,
			}),
		}),
	);
}

beforeEach(() => {
	db.inserts = [];
	db.plan = null;
	db.insertedRows = [];
	sendEmail.mockClear();
	sendOnboardingResumeLink.mockReset();
	verifyRecaptcha.mockReset();
	verifyRecaptcha.mockResolvedValue({ ok: true });
	isRateLimited.mockReset();
	isRateLimited.mockResolvedValue(false);
});

/** Un rechazo: el código que traduce el paso 1, más el texto en español para el log y clientes viejos. */
async function expectFailure(res: Response, status: number, code: string) {
	expect(res.status).toBe(status);
	const body = (await res.json()) as { code?: string; error?: string };
	expect(body.code).toBe(code);
	expect(APPLY_ERROR_CODES as readonly string[]).toContain(body.code);
	expect(body.error?.trim()).toBeTruthy();
	expect(db.insertedRows).toHaveLength(0);
}

describe("POST /api/onboarding/apply", () => {
	it("un correo que ya tenía alta recibe la misma respuesta que uno nuevo", async () => {
		const fresh = await apply();
		const freshBody = await fresh.json();

		db.inserts = [{ data: null, error: { code: "23505", message: "duplicate key value" } }];
		sendOnboardingResumeLink.mockResolvedValue({ found: true, target: "login", email: { status: "sent" } });
		const repeated = await apply();

		expect(repeated.status).toBe(fresh.status);
		expect(await repeated.json()).toEqual(freshBody);
		expect(freshBody).not.toHaveProperty("resumed");
		expect(sendOnboardingResumeLink).toHaveBeenCalledWith(expect.anything(), "dueno@local.com");
	});

	it("sin nada que mandar al correo repetido, tampoco lo dice", async () => {
		const fresh = await (await apply()).json();
		db.inserts = [{ data: null, error: { code: "23505", message: "duplicate key value" } }];
		sendOnboardingResumeLink.mockResolvedValue({ found: false });
		const repeated = await apply();
		expect(repeated.status).toBe(200);
		expect(await repeated.json()).toEqual(fresh);
	});

	it("guarda la versión de los Términos que aceptó", async () => {
		await apply({ legal_version: " 2026-10-08 " });
		expect(db.insertedRows[0]).toMatchObject({ legal_version: "2026-10-08", terms_accepted: true });
	});

	it("una versión con caracteres raros no se guarda", async () => {
		await apply({ legal_version: "<script>" });
		expect(db.insertedRows[0]).not.toHaveProperty("legal_version");
	});

	it("si la columna todavía no existe, el alta sigue sin ella", async () => {
		db.inserts = [
			{ data: null, error: { code: "PGRST204", message: "Could not find the 'legal_version' column of 'onboarding_applications' in the schema cache" } },
			{ data: { id: "app-1" }, error: null },
		];
		const res = await apply({ legal_version: "2026-10-08" });
		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({ ok: true, emailSent: true });
		expect(db.insertedRows).toHaveLength(2);
		expect(db.insertedRows[1]).not.toHaveProperty("legal_version");
	});

	it("con «solo panel CEO» como plan sugerido, el correo de verificación lo sabe", async () => {
		db.plan = { id: "plan-panel", features: { product_mode: "panel_only" } };
		await apply({ plan_id: "plan-panel" });
		const verify = sendEmail.mock.calls.map(([input]) => input as { kind: string; data: Record<string, unknown> }).find((input) => input.kind === "verify_email");
		expect(verify?.data).toMatchObject({ panelOnly: true });
	});

	it("exige al token de reCAPTCHA la acción del paso 1", async () => {
		await apply({ recaptcha_token: "token-del-paso-1" });
		expect(verifyRecaptcha).toHaveBeenCalledWith("token-del-paso-1", expect.any(String), { expectedAction: "onboarding_apply" });
	});

	it("si reCAPTCHA rechaza, no guarda nada, responde recaptcha_failed y deja el motivo en el log", async () => {
		const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
		verifyRecaptcha.mockResolvedValue({ ok: false, error: "low-score", score: 0.1, action: "onboarding_apply" });
		const res = await apply();
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body).toMatchObject({ code: "recaptcha_failed" });
		// El motivo y el puntaje solo van al log.
		expect(body).not.toHaveProperty("score");
		expect(JSON.stringify(body)).not.toContain("low-score");
		expect(db.insertedRows).toHaveLength(0);
		expect(warn).toHaveBeenCalledWith("recaptcha_failed", expect.anything(), { reason: "low-score", score: 0.1, action: "onboarding_apply" });
		warn.mockRestore();
	});

	it("sin nombre del negocio o del responsable responde invalid_input", async () => {
		await expectFailure(await apply({ business_name: "  " }), 400, "invalid_input");
		await expectFailure(await apply({ responsible_name: "A" }), 400, "invalid_input");
	});

	it("un correo mal escrito responde email_invalid", async () => {
		await expectFailure(await apply({ email: "dueno@local" }), 400, "email_invalid");
	});

	it("sin aceptar los términos responde terms_required", async () => {
		await expectFailure(await apply({ privacy_accepted: false }), 400, "terms_required");
	});

	it("con el límite de intentos alcanzado responde rate_limited, exista o no el alta", async () => {
		isRateLimited.mockResolvedValue(true);
		await expectFailure(await apply(), 429, "rate_limited");
		expect(sendOnboardingResumeLink).not.toHaveBeenCalled();
		expect(verifyRecaptcha).not.toHaveBeenCalled();
	});

	it("si la base falla al guardar responde server_error", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
		db.inserts = [{ data: null, error: { code: "08006", message: "connection failure" } }];
		const res = await apply();
		expect(res.status).toBe(500);
		expect(await res.json()).toMatchObject({ code: "server_error" });
		expect(sendEmail).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it("una respuesta correcta no trae código de error", async () => {
		const res = await apply();
		expect(res.status).toBe(200);
		expect(await res.json()).not.toHaveProperty("code");
	});

	it("con un plan con tienda, el correo de verificación va como siempre", async () => {
		db.plan = { id: "plan-pro", features: {} };
		await apply({ plan_id: "plan-pro" });
		const verify = sendEmail.mock.calls.map(([input]) => input as { kind: string; data: Record<string, unknown> }).find((input) => input.kind === "verify_email");
		expect(verify?.data).not.toHaveProperty("panelOnly");
	});
});
