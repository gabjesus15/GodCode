/**
 * Verificación de reCAPTCHA v3 en el servidor: el alta (`apply` del servicio) y la
 * cotización de Gcode Labs (`/api/labs/cotizar`).
 *
 * `success` solo dice que el token es auténtico. Con claves v3 Google suma `score` (0 es un
 * bot, 1 una persona) y la `action` que pidió el navegador: se exige un puntaje mínimo
 * (`RECAPTCHA_MIN_SCORE`, 0.5 por defecto) y, si quien llama la indica, la misma acción,
 * para que un token sacado de otro formulario del sitio no sirva aquí. Las claves v2 no
 * traen ni puntaje ni acción: con ellas basta `success`.
 */

const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/** Lo que se espera a Google: un alta no puede quedarse colgada si no responde. */
const VERIFY_TIMEOUT_MS = 8000;

/** Las acciones que el navegador pide con `execute`; el servidor exige la misma. */
export const RECAPTCHA_ACTIONS = {
	onboardingApply: "onboarding_apply",
	labsQuote: "labs_quote",
} as const;

export type RecaptchaAction = (typeof RECAPTCHA_ACTIONS)[keyof typeof RECAPTCHA_ACTIONS];

/** El punto de partida que recomienda Google. */
export const DEFAULT_RECAPTCHA_MIN_SCORE = 0.5;

let warnedInvalidMinScore = false;

/** `RECAPTCHA_MIN_SCORE` como número entre 0 y 1. Vacío o fuera de rango, 0.5. */
export function resolveRecaptchaMinScore(raw: string | undefined = process.env.RECAPTCHA_MIN_SCORE): number {
	const text = String(raw ?? "").trim();
	if (!text) return DEFAULT_RECAPTCHA_MIN_SCORE;
	const value = Number(text);
	if (Number.isFinite(value) && value >= 0 && value <= 1) return value;
	// Un «50» pensado como porcentaje dejaría pasar a todos o a nadie: se avisa una vez.
	if (!warnedInvalidMinScore) {
		warnedInvalidMinScore = true;
		console.warn(`[recaptcha] RECAPTCHA_MIN_SCORE inválido (${text}): se usa ${DEFAULT_RECAPTCHA_MIN_SCORE}.`);
	}
	return DEFAULT_RECAPTCHA_MIN_SCORE;
}

export type RecaptchaVerification = {
	ok: boolean;
	/** Motivo del rechazo (código de Google o propio). Va al log, nunca al cliente. */
	error?: string;
	/** Lo que respondió Google con claves v3, para el log. */
	score?: number;
	action?: string;
};

type SiteverifyResponse = {
	success?: boolean;
	score?: unknown;
	action?: unknown;
	"error-codes"?: string[];
};

/**
 * Sin clave secreta acepta (entornos sin reCAPTCHA). `expectedAction`: la acción con la que
 * el navegador pidió el token. `minScore` pisa `RECAPTCHA_MIN_SCORE` (para tests).
 */
export async function verifyRecaptcha(
	token: string | null | undefined,
	secretKey: string | undefined,
	options: { expectedAction?: RecaptchaAction; minScore?: number } = {},
): Promise<RecaptchaVerification> {
	if (!secretKey || !secretKey.trim()) {
		return { ok: true };
	}
	if (!token) {
		return { ok: false, error: "missing-input-response" };
	}
	if (typeof token !== "string" || token.length < 10) {
		return { ok: false, error: "invalid-input-response" };
	}

	let data: SiteverifyResponse;
	try {
		const res = await fetch(RECAPTCHA_VERIFY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ secret: secretKey, response: token }).toString(),
			signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
		});
		data = (await res.json()) as SiteverifyResponse;
	} catch (err) {
		return { ok: false, error: err instanceof Error && err.message ? err.message : "siteverify-unreachable" };
	}

	if (!data.success) {
		const codes = data["error-codes"] ?? [];
		return { ok: false, error: codes.join(", ") || "siteverify-failed" };
	}

	const score = typeof data.score === "number" && Number.isFinite(data.score) ? data.score : undefined;
	const action = typeof data.action === "string" ? data.action : undefined;
	// Claves v2: ni puntaje ni acción que revisar.
	if (score === undefined && action === undefined) {
		return { ok: true };
	}

	const minScore = options.minScore ?? resolveRecaptchaMinScore();
	if (score !== undefined && score < minScore) {
		return { ok: false, error: "low-score", score, action };
	}
	if (options.expectedAction && action !== options.expectedAction) {
		return { ok: false, error: "action-mismatch", score, action };
	}
	return { ok: true, score, action };
}
