/**
 * Convierte errores de @supabase (credenciales, código TOTP, red) en mensajes claros para
 * quien entra a un panel. Supabase responde en inglés ("Invalid login credentials"); antes
 * ese texto llegaba tal cual a la pantalla. Los detalles técnicos no se muestran.
 */
const KNOWN_AUTH_ERRORS: Array<[RegExp, string]> = [
	[/invalid login credentials/i, "Correo o contraseña incorrectos."],
	[/email not confirmed/i, "Tu correo aún no está confirmado. Revisa tu bandeja de entrada."],
	[/invalid (totp|mfa)|invalid code|otp.*(expired|invalid)|token has expired/i, "El código no es válido o ya venció. Prueba con el que muestra ahora tu app."],
	[/too many|rate limit|over_request_rate_limit/i, "Demasiados intentos. Espera un minuto y vuelve a intentarlo."],
	[/should be different from the old password/i, "La nueva contraseña debe ser distinta de la anterior."],
	[/password should be at least (\d+)/i, "La contraseña es muy corta."],
	[/weak password|password is too weak/i, "Esa contraseña es muy fácil de adivinar. Usa una más larga."],
	[/auth session missing|session.*(not found|expired)|refresh token/i, "Tu sesión venció. Vuelve a entrar."],
	[/user (not found|banned)/i, "No encontramos una cuenta activa con ese correo."],
];

export function mapAuthClientError(err: unknown): string {
	const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
	const msg =
		err && typeof err === "object" && "message" in err
			? String((err as { message: unknown }).message)
			: err instanceof Error
				? err.message
				: "";

	const lower = msg.toLowerCase();

	if (
		name === "AuthRetryableFetchError" ||
		lower.includes("failed to fetch") ||
		lower.includes("networkerror") ||
		lower.includes("network request failed") ||
		lower.includes("load failed")
	) {
		return "No pudimos conectar con el servicio de acceso. Revisa tu conexión e intenta de nuevo.";
	}

	if (lower.includes("missing supabase environment")) {
		return "El acceso no está disponible en este momento. Escríbenos a soporte.";
	}

	for (const [pattern, message] of KNOWN_AUTH_ERRORS) {
		if (pattern.test(msg)) return message;
	}

	// Mensajes propios de la app (ya en español) pasan tal cual; lo demás, genérico.
	if (msg.trim() && /[áéíóúñ¿¡]|\b(el|la|tu|no|de)\b/i.test(msg)) return msg;
	return "No se pudo completar el acceso. Intenta de nuevo.";
}
