/**
 * Calculadora de comisiones de apps de delivery (página /calculadora-comisiones).
 *
 * No trae tarifas de ninguna app: el dueño ingresa la suya, porque cambia según contrato,
 * país y tipo de envío. Los escenarios muestran qué pasa si solo una parte de los pedidos
 * se mueve al canal propio: casi nadie deja las apps de un día para otro.
 */

export const DEFAULT_COMMISSION_PERCENT = 25;
export const MAX_COMMISSION_PERCENT = 40;
export const SHIFT_SCENARIOS = [0.3, 0.5, 1] as const;

export type CommissionScenario = {
	/** Fracción de las ventas por apps que pasa al canal propio (0–1). */
	share: number;
	/** Comisión que se deja de pagar al mes. */
	commissionSaved: number;
	/** Ahorro neto al mes, ya descontado el plan (puede ser negativo). */
	netMonthly: number;
};

export type CommissionEstimate = {
	monthlyCommission: number;
	yearlyCommission: number;
	scenarios: CommissionScenario[];
};

function clamp(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, value));
}

export function estimateCommissions(input: {
	monthlySales: number;
	commissionPercent: number;
	planMonthlyPrice: number;
}): CommissionEstimate {
	const sales = Math.max(0, Number.isFinite(input.monthlySales) ? input.monthlySales : 0);
	const rate = clamp(input.commissionPercent, 0, MAX_COMMISSION_PERCENT) / 100;
	const plan = Math.max(0, Number.isFinite(input.planMonthlyPrice) ? input.planMonthlyPrice : 0);

	const monthlyCommission = sales * rate;

	return {
		monthlyCommission,
		yearlyCommission: monthlyCommission * 12,
		scenarios: SHIFT_SCENARIOS.map((share) => {
			const commissionSaved = monthlyCommission * share;
			return { share, commissionSaved, netMonthly: commissionSaved - plan };
		}),
	};
}

/** "12.500", "12,500.50" o "$ 12 500" → número. Acepta el separador de miles de cada país. */
export function parseMoneyInput(raw: string, currency: string): number {
	const digits = raw.replace(/[^\d.,]/g, "");
	if (!digits) return 0;
	// CLP no usa decimales: puntos y comas son separadores de miles.
	if (currency === "CLP") return Number(digits.replace(/[.,]/g, "")) || 0;
	// Resto: la última coma o punto seguido de 1–2 dígitos es el decimal.
	const match = digits.match(/^(.*?)[.,](\d{1,2})$/);
	const whole = (match ? match[1] : digits).replace(/[.,]/g, "");
	const cents = match ? match[2] : "";
	return Number(cents ? `${whole}.${cents}` : whole) || 0;
}
