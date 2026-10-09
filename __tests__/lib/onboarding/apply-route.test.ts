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
vi.mock("@/lib/onboarding/recaptcha", () => ({ verifyRecaptcha: async () => ({ ok: true }) }));
vi.mock("@/lib/onboarding/rate-limit", () => ({ isRateLimited: async () => false }));
vi.mock("@/lib/onboarding/team-alerts", () => ({ alertOnboardingTeam: async () => undefined }));
const sendEmail = vi.fn(async (_input: unknown) => ({ status: "sent" as const }));
vi.mock("@/lib/email/send", () => ({ sendEmail: (input: unknown) => sendEmail(input), teamInbox: () => null }));
const sendOnboardingResumeLink = vi.fn();
vi.mock("@/lib/onboarding/resume-application", () => ({
	sendOnboardingResumeLink: (...args: unknown[]) => sendOnboardingResumeLink(...args),
}));

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
});

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

	it("con un plan con tienda, el correo de verificación va como siempre", async () => {
		db.plan = { id: "plan-pro", features: {} };
		await apply({ plan_id: "plan-pro" });
		const verify = sendEmail.mock.calls.map(([input]) => input as { kind: string; data: Record<string, unknown> }).find((input) => input.kind === "verify_email");
		expect(verify?.data).not.toHaveProperty("panelOnly");
	});
});
