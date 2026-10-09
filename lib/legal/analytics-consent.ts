import { ANALYTICS_CONSENT_MAX_AGE_MS } from "./legal-documents";

export type AnalyticsConsentChoice = "granted" | "denied";

/**
 * Interpreta la elección guardada en el almacenamiento local. Devuelve null si no
 * hay elección válida o si venció: en ese caso el aviso de cookies se vuelve a
 * mostrar. El script de consentimiento de `app/layout.tsx` aplica la misma regla.
 */
export function parseStoredConsent(raw: string | null, now: number): AnalyticsConsentChoice | null {
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw) as { choice?: unknown; at?: unknown } | null;
		if (!parsed || (parsed.choice !== "granted" && parsed.choice !== "denied")) return null;
		if (typeof parsed.at !== "number" || parsed.at > now || now - parsed.at > ANALYTICS_CONSENT_MAX_AGE_MS) return null;
		return parsed.choice;
	} catch {
		return null;
	}
}

export function serializeConsent(choice: AnalyticsConsentChoice, now: number): string {
	return JSON.stringify({ choice, at: now });
}
