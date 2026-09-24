/**
 * Cuentas del portal /cuenta: renovar, cambiar de plan y contratar extras.
 *
 * Son funciones puras para que el servidor cobre exactamente lo que el navegador muestra.
 * Reglas:
 * - Todo en USD y en meses de 30 días, igual que el alta.
 * - Los extras mensuales y las sucursales extra vencen con la suscripción (co-terminados):
 *   al contratarlos se paga solo hasta el vencimiento, y al renovar entran en la cuenta.
 * - Subir de plan cobra la diferencia por los días que quedan; el vencimiento no cambia.
 * - Bajar de plan se programa para el vencimiento, sin reembolso.
 */

export const BILLING_MONTH_DAYS = 30;
const DAY_MS = 86_400_000;

/** Meses que se pueden pagar al renovar (los mismos que en el alta). */
export const RENEWAL_MONTH_OPTIONS = [1, 3, 6, 12] as const;
export type RenewalMonths = (typeof RENEWAL_MONTH_OPTIONS)[number];

export function isRenewalMonths(value: unknown): value is RenewalMonths {
	return RENEWAL_MONTH_OPTIONS.includes(Number(value) as RenewalMonths);
}

export function roundUsd(value: number): number {
	const n = Number(value);
	return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Montos del SaaS: siempre en dólares, aunque el negocio venda en otra moneda. */
export function formatUsd(value: number | null | undefined, locale = "es-CL"): string {
	const n = Number(value);
	if (value == null || !Number.isFinite(n)) return "-";
	try {
		return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
	} catch {
		return `USD ${n.toFixed(2)}`;
	}
}

/** Días que quedan del periodo pagado; `null` si no hay periodo vigente (sin fecha o ya vencido). */
export function remainingPaidDays(endsAt: string | null | undefined, now = new Date()): number | null {
	if (!endsAt) return null;
	const end = new Date(endsAt).getTime();
	if (!Number.isFinite(end)) return null;
	const diff = end - now.getTime();
	return diff > 0 ? Math.ceil(diff / DAY_MS) : null;
}

/**
 * Vencimiento tras pagar `months` meses. Si el vigente todavía no pasó, se suma desde ahí:
 * renovar antes de tiempo no resta días.
 */
export function extendSubscriptionEnd(months: number, now = new Date(), currentEndsAt?: string | null): string {
	const current = currentEndsAt ? new Date(currentEndsAt) : null;
	const base = current && Number.isFinite(current.getTime()) && current > now ? current : new Date(now);
	// Días de 24 h exactas (en UTC): el resultado no depende de la zona horaria del servidor.
	const endsAt = new Date(base);
	endsAt.setUTCDate(endsAt.getUTCDate() + Math.max(1, Math.floor(Number(months)) || 1) * BILLING_MONTH_DAYS);
	return endsAt.toISOString();
}

/**
 * En qué momento está la suscripción, visto desde lo que el dueño puede hacer:
 * - `active` / `trial`: periodo vigente.
 * - `cancelling`: canceló, pero sigue online hasta el vencimiento.
 * - `payment_pending`: el primer pago del alta aún no se valida.
 * - `expired`: vencida o suspendida; solo puede renovar.
 * - `open_ended`: sin fecha de vencimiento (planes internos); la gestiona el equipo.
 */
export type SubscriptionPhase = "active" | "trial" | "cancelling" | "payment_pending" | "expired" | "open_ended";

export function resolveSubscriptionPhase(
	status: string | null | undefined,
	endsAt: string | null | undefined,
	now = new Date(),
): SubscriptionPhase {
	const s = String(status ?? "").trim().toLowerCase();
	if (s === "payment_pending") return "payment_pending";
	if (s === "suspended") return "expired";
	const cancelled = s === "cancelled" || s === "canceled";
	if (!endsAt) return cancelled ? "expired" : "open_ended";
	if (remainingPaidDays(endsAt, now) == null) return "expired";
	if (cancelled) return "cancelling";
	if (s === "trial" || s === "trialing") return "trial";
	return "active";
}

export type PlanChangeQuote =
	/** Sube de plan ya y paga la diferencia por los días que quedan. */
	| { mode: "upgrade"; monthlyDiff: number; remainingDays: number; amount: number }
	/** Baja de plan al vencimiento, sin cobro ni reembolso. */
	| { mode: "downgrade"; monthlyDiff: number; effectiveAt: string }
	/** Cambio inmediato y sin cobro (mismo precio, o durante la prueba). */
	| { mode: "switch"; monthlyDiff: number }
	| { mode: "blocked"; monthlyDiff: number; reason: Exclude<SubscriptionPhase, "active" | "trial"> };

export function quotePlanChange(params: {
	phase: SubscriptionPhase;
	currentMonthly: number;
	targetMonthly: number;
	endsAt: string | null | undefined;
	now?: Date;
}): PlanChangeQuote {
	const now = params.now ?? new Date();
	const monthlyDiff = roundUsd(params.targetMonthly - params.currentMonthly);
	const { phase } = params;

	if (phase !== "active" && phase !== "trial") return { mode: "blocked", monthlyDiff, reason: phase };
	// En la prueba no se ha pagado nada: se puede probar otro plan sin cobro.
	if (phase === "trial") return { mode: "switch", monthlyDiff };

	const remainingDays = remainingPaidDays(params.endsAt, now);
	if (remainingDays == null || !params.endsAt) return { mode: "blocked", monthlyDiff, reason: "expired" };

	if (monthlyDiff < 0) return { mode: "downgrade", monthlyDiff, effectiveAt: params.endsAt };
	if (monthlyDiff > 0) {
		const amount = roundUsd((monthlyDiff * remainingDays) / BILLING_MONTH_DAYS);
		if (amount > 0) return { mode: "upgrade", monthlyDiff, remainingDays, amount };
	}
	return { mode: "switch", monthlyDiff };
}

/** Cargo mensual que se renueva con el plan (extra mensual, sucursales extra). */
export type RecurringCharge = {
	key: string;
	label: string;
	unitMonthly: number;
	quantity: number;
};

export type RenewalLine = RecurringCharge & { monthly: number };

export type RenewalQuote = {
	months: number;
	lines: RenewalLine[];
	monthlyTotal: number;
	amount: number;
	/** Desde cuándo corren los meses nuevos: el vencimiento vigente, o hoy si ya venció. */
	startsAt: string;
	newEndsAt: string;
};

export function quoteRenewal(params: {
	plan: { label: string; unitMonthly: number };
	recurring: RecurringCharge[];
	months: number;
	endsAt: string | null | undefined;
	now?: Date;
}): RenewalQuote {
	const now = params.now ?? new Date();
	const months = Math.max(1, Math.floor(Number(params.months)) || 1);
	const lines: RenewalLine[] = [
		{ key: "plan", label: params.plan.label, unitMonthly: roundUsd(params.plan.unitMonthly), quantity: 1 },
		...params.recurring.filter((charge) => charge.unitMonthly > 0 && charge.quantity > 0),
	].map((charge) => ({ ...charge, monthly: roundUsd(charge.unitMonthly * charge.quantity) }));
	const monthlyTotal = roundUsd(lines.reduce((sum, line) => sum + line.monthly, 0));
	const current = remainingPaidDays(params.endsAt, now) != null ? new Date(params.endsAt as string) : now;
	return {
		months,
		lines,
		monthlyTotal,
		amount: roundUsd(monthlyTotal * months),
		startsAt: current.toISOString(),
		newEndsAt: extendSubscriptionEnd(months, now, params.endsAt),
	};
}

export type CoTermQuote = {
	remainingDays: number;
	amount: number;
	/** Hasta cuándo cubre el pago: el vencimiento de la suscripción. */
	coversUntil: string;
};

/**
 * Extra mensual o sucursal extra contratada a mitad de ciclo: se paga la parte del mes
 * hasta el vencimiento (puede ser más de un mes si el plan se pagó por adelantado).
 * `null` si no hay periodo vigente al que sumarse.
 */
export function quoteCoTermCharge(params: {
	unitMonthly: number;
	quantity: number;
	endsAt: string | null | undefined;
	now?: Date;
}): CoTermQuote | null {
	const remainingDays = remainingPaidDays(params.endsAt, params.now ?? new Date());
	if (remainingDays == null || !params.endsAt) return null;
	const quantity = Math.max(1, Math.floor(Number(params.quantity)) || 1);
	return {
		remainingDays,
		amount: roundUsd((params.unitMonthly * quantity * remainingDays) / BILLING_MONTH_DAYS),
		coversUntil: new Date(params.endsAt).toISOString(),
	};
}
