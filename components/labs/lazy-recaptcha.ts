/**
 * reCAPTCHA v3 cargado a demanda para el formulario de cotización de Gcode Labs.
 *
 * El alta usa `OnboardingRecaptchaProvider`, que carga el script de Google al montar la
 * página. En la home del estudio eso significa descargarlo (y mostrar el distintivo de
 * reCAPTCHA) a cada visita, aunque nadie llegue al formulario. Aquí el script se pide
 * cuando la persona empieza a escribir, y el token se pide al enviar.
 *
 * Sin `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` no carga nada y el token sale vacío: la ruta
 * solo lo exige cuando el sitio tiene las dos claves (`app/api/labs/cotizar`), y entonces
 * exige también la acción con que se pidió (`RECAPTCHA_ACTIONS`).
 */

import type { RecaptchaAction } from "@/lib/onboarding/recaptcha";

type Grecaptcha = {
	ready(callback: () => void): void;
	execute(siteKey: string, options: { action: string }): Promise<string>;
};

export const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || "";

/** Lo que se espera al script o al token antes de rendirse: un envío no puede quedarse colgado. */
const WAIT_MS = 8000;

let loading: Promise<Grecaptcha | null> | null = null;

/** Pide el script una sola vez. Si falla (sin red, un bloqueador), el siguiente intento lo vuelve a pedir. */
export function preloadRecaptcha(): Promise<Grecaptcha | null> {
	if (!RECAPTCHA_SITE_KEY || typeof document === "undefined") return Promise.resolve(null);
	loading ??= new Promise<Grecaptcha | null>((resolve) => {
		const script = document.createElement("script");
		script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(RECAPTCHA_SITE_KEY)}`;
		script.async = true;
		script.onload = () => {
			const grecaptcha = (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;
			if (grecaptcha) grecaptcha.ready(() => resolve(grecaptcha));
			else resolve(null);
		};
		script.onerror = () => {
			script.remove();
			loading = null;
			resolve(null);
		};
		document.head.appendChild(script);
	});
	return loading;
}

function after<T>(ms: number, value: T): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/** Token para `action`, o cadena vacía si no hay clave, el script no cargó o Google no respondió a tiempo. */
export async function getRecaptchaToken(action: RecaptchaAction): Promise<string> {
	if (!RECAPTCHA_SITE_KEY) return "";
	try {
		const grecaptcha = await Promise.race([preloadRecaptcha(), after(WAIT_MS, null)]);
		if (!grecaptcha) return "";
		return await Promise.race([grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }), after(WAIT_MS, "")]);
	} catch {
		return "";
	}
}
