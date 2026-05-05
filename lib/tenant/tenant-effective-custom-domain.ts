/**
 * Dominio personalizado efectivo para enlaces y UI.
 * Sigue la misma regla que el proxy y el menú público: activo, no suspendido/cancelado,
 * y si hay fecha de fin de suscripción, aún no vencida.
 */
export function getEffectiveCustomDomain(
	customDomain: string | null | undefined,
	subscriptionEndsAt: string | null | undefined,
	subscriptionStatus: string | null | undefined
): string | null {
	if (!customDomain?.trim()) {
		return null;
	}
	const st = subscriptionStatus?.toLowerCase() ?? "";
	if (st === "suspended" || st === "cancelled") {
		return null;
	}
	if (subscriptionEndsAt) {
		const end = new Date(subscriptionEndsAt);
		if (!Number.isNaN(end.getTime()) && end.getTime() <= Date.now()) {
			return null;
		}
	}
	return customDomain.trim();
}
