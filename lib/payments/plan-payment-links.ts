/**
 * Métodos de pago "por enlace": el cobro lo hace la plataforma con un enlace fijo por plan
 * (p. ej. las suscripciones de Mercado Pago). Cada enlace cobra siempre el precio mensual
 * del plan, así que no se pueden aplicar meses, cupones ni extras; el alta queda pendiente
 * hasta que el equipo valida el comprobante, igual que una transferencia.
 *
 * Sin imports de servidor: lo usan el checkout, la página de pago y el super admin.
 */

export const LINK_METHOD_SLUGS = new Set(["mercadopago"]);

export function isLinkMethod(method: string | null | undefined): boolean {
	return LINK_METHOD_SLUGS.has(String(method ?? "").trim().toLowerCase());
}

/** "Básico" → "basico", "Plan Business" → "plan_business". */
export function normalizePlanKey(planName: string): string {
	return planName
		.normalize("NFD")
		.replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

/** Clave en `plan_payment_method_config` con el enlace del plan: `link_basico`, `link_business`… */
export function planLinkConfigKey(planName: string): string {
	return `link_${normalizePlanKey(planName)}`;
}

/** Enlace de pago del plan, o `null` si no hay uno válido (solo https). */
export function resolvePlanPaymentLink(config: Record<string, string>, planName: string): string | null {
	const normalized = normalizePlanKey(planName);
	// Acepta "Plan Basico" con la clave `link_basico`.
	const candidates = [planLinkConfigKey(planName), `link_${normalized.replace(/^plan_/, "")}`];
	for (const key of candidates) {
		const value = String(config[key] ?? "").trim();
		if (!value) continue;
		try {
			const url = new URL(value);
			if (url.protocol === "https:") return url.toString();
		} catch {
			// Enlace mal escrito en el panel: se ignora.
		}
	}
	return null;
}
