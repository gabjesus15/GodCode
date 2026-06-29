export function getDaysUntilSubscriptionEnd(iso: string | null | undefined, now = new Date()): number | null {
	if (!iso) return null;
	const endMs = new Date(iso).getTime();
	if (Number.isNaN(endMs)) return null;
	const diff = endMs - now.getTime();
	return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Prorrateo del primer ciclo según días restantes del plan (misma regla que billing POST). */
export function computeExpansionFirstCycleFactor(
	subscriptionEndsAt: string | null | undefined,
	now = new Date(),
): number {
	const daysUntilPlanEnd = getDaysUntilSubscriptionEnd(subscriptionEndsAt, now);
	if (daysUntilPlanEnd != null && daysUntilPlanEnd > 0) {
		return Math.max(1 / 30, Math.min(1, daysUntilPlanEnd / 30));
	}
	return 1;
}

export function computeExpansionAmount(params: {
	unitPrice: number;
	quantity: number;
	months: number;
	subscriptionEndsAt?: string | null;
	now?: Date;
}): {
	firstCycleFactor: number;
	effectiveMonths: number;
	amount: number;
	daysUntilPlanEnd: number | null;
} {
	const now = params.now ?? new Date();
	const quantity = Math.max(1, params.quantity);
	const months = Math.max(1, params.months);
	const firstCycleFactor = computeExpansionFirstCycleFactor(params.subscriptionEndsAt, now);
	const effectiveMonths = firstCycleFactor + Math.max(0, months - 1);
	const amount = Number((params.unitPrice * quantity * effectiveMonths).toFixed(2));
	return {
		firstCycleFactor,
		effectiveMonths,
		amount,
		daysUntilPlanEnd: getDaysUntilSubscriptionEnd(params.subscriptionEndsAt, now),
	};
}
