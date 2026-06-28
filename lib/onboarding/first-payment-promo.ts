export type FirstPaymentPromoResolution = {
	chargedMonths: number;
	grantedMonths: number;
	promoApplied: boolean;
};

/**
 * Resuelve cuántos meses se cobran y cuántos se otorgan bajo la promo
 * "+1 mes gratis en tu primer pago".
 *
 * Reglas:
 * - Si no es elegible: cobra y otorga los meses pagados.
 * - Si es elegible: cobra N meses y otorga N + 1 meses.
 * - N siempre está entre 1 y 12.
 */
export function resolveFirstPaymentPromo(
	monthsPaid: number,
	isEligible: boolean,
): FirstPaymentPromoResolution {
	const paid = Math.max(1, Math.min(12, monthsPaid));
	if (!isEligible) {
		return {
			chargedMonths: paid,
			grantedMonths: paid,
			promoApplied: false,
		};
	}
	return {
		chargedMonths: paid,
		grantedMonths: paid + 1,
		promoApplied: true,
	};
}
