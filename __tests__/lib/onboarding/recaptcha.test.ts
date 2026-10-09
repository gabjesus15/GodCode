import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_RECAPTCHA_MIN_SCORE, RECAPTCHA_ACTIONS, resolveRecaptchaMinScore, verifyRecaptcha } from "@/lib/onboarding/recaptcha";

const TOKEN = "token-de-prueba-123";
const SECRET = "secreto";

/** Lo que responde siteverify; guarda el cuerpo enviado para revisarlo. */
function stubSiteverify(response: Record<string, unknown> | Error) {
	const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
		if (response instanceof Error) throw response;
		return { json: async () => response } as Response;
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

afterEach(() => {
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("verifyRecaptcha", () => {
	it("sin clave secreta acepta sin llamar a Google", async () => {
		const fetchMock = stubSiteverify({ success: false });
		expect(await verifyRecaptcha("", "")).toEqual({ ok: true });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sin token o con uno cortado rechaza sin llamar a Google", async () => {
		const fetchMock = stubSiteverify({ success: true });
		expect(await verifyRecaptcha(null, SECRET)).toMatchObject({ ok: false, error: "missing-input-response" });
		expect(await verifyRecaptcha("corto", SECRET)).toMatchObject({ ok: false, error: "invalid-input-response" });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("manda el secreto y el token a siteverify", async () => {
		const fetchMock = stubSiteverify({ success: true, score: 0.9, action: "onboarding_apply" });
		await verifyRecaptcha(TOKEN, SECRET, { expectedAction: RECAPTCHA_ACTIONS.onboardingApply });
		const body = new URLSearchParams(String(fetchMock.mock.calls[0]?.[1]?.body));
		expect(body.get("secret")).toBe(SECRET);
		expect(body.get("response")).toBe(TOKEN);
	});

	it("con success en false devuelve los códigos de Google como motivo", async () => {
		stubSiteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
		expect(await verifyRecaptcha(TOKEN, SECRET)).toEqual({ ok: false, error: "timeout-or-duplicate" });
	});

	it("acepta un puntaje suficiente con la acción esperada", async () => {
		stubSiteverify({ success: true, score: 0.7, action: "onboarding_apply" });
		expect(await verifyRecaptcha(TOKEN, SECRET, { expectedAction: RECAPTCHA_ACTIONS.onboardingApply })).toEqual({
			ok: true,
			score: 0.7,
			action: "onboarding_apply",
		});
	});

	it("rechaza un puntaje bajo y lo deja para el log", async () => {
		stubSiteverify({ success: true, score: 0.3, action: "onboarding_apply" });
		expect(await verifyRecaptcha(TOKEN, SECRET, { expectedAction: RECAPTCHA_ACTIONS.onboardingApply })).toEqual({
			ok: false,
			error: "low-score",
			score: 0.3,
			action: "onboarding_apply",
		});
	});

	it("el puntaje justo en el mínimo pasa", async () => {
		stubSiteverify({ success: true, score: DEFAULT_RECAPTCHA_MIN_SCORE, action: "labs_quote" });
		expect(await verifyRecaptcha(TOKEN, SECRET, { expectedAction: RECAPTCHA_ACTIONS.labsQuote })).toMatchObject({ ok: true });
	});

	it("un token de otra acción no sirve aunque el puntaje sea alto", async () => {
		stubSiteverify({ success: true, score: 0.9, action: "labs_quote" });
		expect(await verifyRecaptcha(TOKEN, SECRET, { expectedAction: RECAPTCHA_ACTIONS.onboardingApply })).toEqual({
			ok: false,
			error: "action-mismatch",
			score: 0.9,
			action: "labs_quote",
		});
	});

	it("con claves v3 y sin acción en la respuesta, no pasa si se esperaba una", async () => {
		stubSiteverify({ success: true, score: 0.9 });
		expect(await verifyRecaptcha(TOKEN, SECRET, { expectedAction: RECAPTCHA_ACTIONS.onboardingApply })).toMatchObject({
			ok: false,
			error: "action-mismatch",
		});
	});

	it("sin acción esperada solo cuenta el puntaje", async () => {
		stubSiteverify({ success: true, score: 0.8, action: "cualquiera" });
		expect(await verifyRecaptcha(TOKEN, SECRET)).toMatchObject({ ok: true });
	});

	it("con claves v2 (sin puntaje ni acción) basta success", async () => {
		stubSiteverify({ success: true, hostname: "godcode.me" });
		expect(await verifyRecaptcha(TOKEN, SECRET, { expectedAction: RECAPTCHA_ACTIONS.onboardingApply })).toEqual({ ok: true });
	});

	it("respeta RECAPTCHA_MIN_SCORE", async () => {
		vi.stubEnv("RECAPTCHA_MIN_SCORE", "0.8");
		stubSiteverify({ success: true, score: 0.7, action: "onboarding_apply" });
		expect(await verifyRecaptcha(TOKEN, SECRET, { expectedAction: RECAPTCHA_ACTIONS.onboardingApply })).toMatchObject({
			ok: false,
			error: "low-score",
		});
	});

	it("si Google no responde, rechaza con el motivo", async () => {
		stubSiteverify(new Error("fetch failed"));
		expect(await verifyRecaptcha(TOKEN, SECRET)).toEqual({ ok: false, error: "fetch failed" });
	});
});

describe("resolveRecaptchaMinScore", () => {
	it("vacío o inválido usa 0.5; un número entre 0 y 1 se respeta", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
		expect(resolveRecaptchaMinScore(undefined)).toBe(0.5);
		expect(resolveRecaptchaMinScore("  ")).toBe(0.5);
		expect(resolveRecaptchaMinScore("0.3")).toBe(0.3);
		expect(resolveRecaptchaMinScore("0")).toBe(0);
		expect(resolveRecaptchaMinScore("1")).toBe(1);
		expect(resolveRecaptchaMinScore("50")).toBe(0.5);
		expect(resolveRecaptchaMinScore("alto")).toBe(0.5);
		warn.mockRestore();
	});
});
