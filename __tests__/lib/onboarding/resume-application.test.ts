import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn(async (_input: unknown) => ({ status: "sent" as const }));
vi.mock("@/lib/email/send", () => ({ sendEmail: (input: unknown) => sendEmail(input) }));
const createPasswordSetupLink = vi.fn(async () => "https://www.godcode.me/login/confirmar?token_hash=secreto&type=recovery");
vi.mock("@/lib/auth/password-setup-link", () => ({ createPasswordSetupLink }));

import { sendOnboardingResumeLink } from "@/lib/onboarding/resume-application";

type Row = Record<string, unknown>;

/** Cliente falso: la solicitud más reciente del correo y las features de su plan. */
function admin(app: Row | null, planFeatures: unknown = {}) {
	return {
		from: (table: string) => {
			const query: Record<string, unknown> = {};
			for (const method of ["select", "eq", "order", "limit"]) query[method] = () => query;
			query.maybeSingle = async () => ({ data: table === "plans" ? { features: planFeatures } : app, error: null });
			return query;
		},
	} as never;
}

const BASE = {
	id: "app-1",
	email: "dueno@local.com",
	responsible_name: "Ana",
	business_name: "Rica Pizza",
	verification_token: "tok-secreto",
	payment_status: null,
	payment_reference_url: null,
	company_id: null,
	plan_id: "plan-pro",
};

const sentInput = () => sendEmail.mock.calls[0]?.[0] as { kind: string; data: Record<string, unknown> };

beforeEach(() => {
	vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.godcode.me");
	sendEmail.mockClear();
	createPasswordSetupLink.mockClear();
});

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("sendOnboardingResumeLink", () => {
	it("a una cuenta que ya existe le manda un aviso sin token ni enlace de contraseña", async () => {
		const result = await sendOnboardingResumeLink(admin({ ...BASE, status: "active", payment_status: "paid", company_id: "c1" }), "Dueno@Local.com");

		expect(result).toMatchObject({ found: true, target: "login" });
		expect(createPasswordSetupLink).not.toHaveBeenCalled();
		const input = sentInput();
		expect(input.kind).toBe("onboarding_existing_account");
		expect(input.data).toEqual({ name: "Ana", loginUrl: "https://www.godcode.me/login", recoverUrl: "https://www.godcode.me/login/recuperar" });
		expect(JSON.stringify(input)).not.toContain("tok-secreto");
	});

	it("quien armó su tienda en vista previa también recibe el aviso neutro", async () => {
		await sendOnboardingResumeLink(admin({ ...BASE, status: "email_verified", company_id: "c1" }), BASE.email);
		expect(sentInput().kind).toBe("onboarding_existing_account");
	});

	it("con «solo panel CEO» el correo de verificación no promete la tienda", async () => {
		await sendOnboardingResumeLink(admin({ ...BASE, status: "pending_verification" }, { product_mode: "panel_only" }), BASE.email);
		const input = sentInput();
		expect(input.kind).toBe("verify_email");
		expect(input.data).toMatchObject({ panelOnly: true, verifyUrl: "https://www.godcode.me/onboarding/verify/tok-secreto" });
	});

	it("con un plan con tienda el correo de verificación va como siempre", async () => {
		await sendOnboardingResumeLink(admin({ ...BASE, status: "pending_verification" }), BASE.email);
		expect(sentInput().data).not.toHaveProperty("panelOnly");
	});

	it("sin solicitud no manda nada", async () => {
		expect(await sendOnboardingResumeLink(admin(null), BASE.email)).toEqual({ found: false });
		expect(sendEmail).not.toHaveBeenCalled();
	});
});
