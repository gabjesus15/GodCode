/**
 * Empresas cuyo estado no cuadra con sus pagos (antes, la página "Salud de pagos"; ahora un
 * aviso sobre su fila del Inicio). Funciones puras: sin Supabase.
 */

/** Estados de `payments_history` que cuentan como cobrados. */
export const PAID_PAYMENT_STATUSES = ["paid", "approved"] as const;

const RECENT_PAYMENT_DAYS = 90;
const DAY_MS = 86_400_000;

export type PaymentMismatch =
	| { kind: "active_without_paid" }
	| { kind: "suspended_with_recent_paid"; paidAt: string };

/** Último pago cobrado de cada empresa. `payments` debe venir de más nuevo a más viejo. */
export function latestPaidByCompany(
	payments: Array<{ company_id: string | null; status: string | null; payment_date: string | null }>,
): Map<string, string | null> {
	const out = new Map<string, string | null>();
	for (const p of payments) {
		if (!p.company_id || out.has(p.company_id)) continue;
		if (!(PAID_PAYMENT_STATUSES as readonly string[]).includes(String(p.status ?? "").toLowerCase())) continue;
		out.set(p.company_id, p.payment_date);
	}
	return out;
}

/**
 * - Activa sin ningún pago cobrado. No aplica a planes internos o gratis (sin precio o sin
 *   vencimiento): esos nunca pagan y daban falsas alarmas.
 * - Suspendida con un pago cobrado en los últimos 90 días: quizás hay que reactivarla.
 */
export function detectPaymentMismatch(input: {
	status: string | null;
	planPrice: number | null;
	endsAt: string | null;
	/** `undefined`: nunca pagó. `null`: pagó, pero sin fecha registrada. */
	lastPaidAt: string | null | undefined;
	now?: Date;
}): PaymentMismatch | null {
	const status = String(input.status ?? "").toLowerCase();
	const paysForPlan = (input.planPrice ?? 0) > 0 && input.endsAt != null;

	if (status === "active" && paysForPlan && input.lastPaidAt === undefined) {
		return { kind: "active_without_paid" };
	}
	if (status === "suspended" && input.lastPaidAt) {
		const paidMs = new Date(input.lastPaidAt).getTime();
		const nowMs = (input.now ?? new Date()).getTime();
		if (Number.isFinite(paidMs) && nowMs - paidMs < RECENT_PAYMENT_DAYS * DAY_MS) {
			return { kind: "suspended_with_recent_paid", paidAt: input.lastPaidAt };
		}
	}
	return null;
}
