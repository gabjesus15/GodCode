const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

export async function verifyRecaptcha(
	token: string | null | undefined,
	secretKey: string | undefined
): Promise<{ ok: boolean; error?: string }> {
	if (!secretKey || !secretKey.trim()) {
		return { ok: true };
	}

	if (!token || typeof token !== "string" || token.length < 10) {
		return { ok: false, error: "Token reCAPTCHA inválido o faltante" };
	}

	try {
		const res = await fetch(RECAPTCHA_VERIFY_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				secret: secretKey,
				response: token,
			}).toString(),
		});

		const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
		if (!data.success) {
			const codes = data["error-codes"] ?? [];
			return { ok: false, error: codes.join(", ") || "Verificación reCAPTCHA fallida" };
		}
		return { ok: true };
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Error verifying captcha";
		return { ok: false, error: msg };
	}
}
