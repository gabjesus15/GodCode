/**
 * El token de la solicitud, guardado en esta pestaña mientras se paga, para que la página
 * de éxito deje crear la contraseña sin ir al correo. `sessionStorage` sobrevive a la ida
 * y vuelta a PayPal en la misma pestaña y se borra al cerrarla.
 */
const KEY = "gc_onboarding_token";

export function rememberOnboardingToken(token: string): void {
	try {
		sessionStorage.setItem(KEY, token);
	} catch {
		// Sin sessionStorage la contraseña se crea desde el correo, como antes.
	}
}

export function readOnboardingToken(): string | null {
	try {
		return sessionStorage.getItem(KEY);
	} catch {
		return null;
	}
}

export function forgetOnboardingToken(): void {
	try {
		sessionStorage.removeItem(KEY);
	} catch {
		// Nada que borrar.
	}
}
