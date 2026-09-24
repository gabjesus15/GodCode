import { isTenantSubscriptionAccessible } from "@/lib/plans/tenant-subscription";

/**
 * Dominio personalizado efectivo para enlaces y UI. Misma regla que el menú público
 * (`isTenantSubscriptionAccessible`): no suspendido, no vencido, y una cancelación
 * programada lo mantiene hasta el vencimiento.
 */
export function getEffectiveCustomDomain(
	customDomain: string | null | undefined,
	subscriptionEndsAt: string | null | undefined,
	subscriptionStatus: string | null | undefined
): string | null {
	if (!customDomain?.trim()) {
		return null;
	}
	if (
		!isTenantSubscriptionAccessible({
			subscription_status: subscriptionStatus ?? null,
			subscription_ends_at: subscriptionEndsAt ?? null,
		})
	) {
		return null;
	}
	return customDomain.trim();
}
