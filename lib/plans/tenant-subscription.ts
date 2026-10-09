import { isStoreDraftPending, type StoreDraftCompany, type TenantPublicView } from "@/lib/tenant/store-draft";

export type TenantSubscriptionSnapshot = {
	subscription_status: string | null;
	subscription_ends_at: string | null;
};

export function isTenantSubscriptionAccessible(
	company: TenantSubscriptionSnapshot | null | undefined,
	now = new Date()
): boolean {
	if (!company) {
		return false;
	}

	const status = String(company.subscription_status ?? "").trim().toLowerCase();
	if (status === "suspended") {
		return false;
	}

	const endsAt = company.subscription_ends_at ? new Date(company.subscription_ends_at).getTime() : null;
	if (endsAt != null && Number.isFinite(endsAt) && endsAt <= now.getTime()) {
		return false;
	}

	if (status === "cancelled") {
		return endsAt != null && Number.isFinite(endsAt) && endsAt > now.getTime();
	}

	return true;
}

/**
 * Qué ve el público: `closed` si la suscripción no da acceso, `draft` si la tienda sigue
 * en vista previa («Arma y paga», solo la ve su dueño) y `open` en el resto.
 */
export function resolveTenantPublicView(
	company: (TenantSubscriptionSnapshot & StoreDraftCompany) | null | undefined,
	now = new Date()
): TenantPublicView {
	if (!isTenantSubscriptionAccessible(company, now)) return "closed";
	return isStoreDraftPending(company) ? "draft" : "open";
}

/** Pedidos, cuentas de cliente y todo lo que no es la vista previa del dueño. */
export function isTenantPubliclyOpen(
	company: (TenantSubscriptionSnapshot & StoreDraftCompany) | null | undefined,
	now = new Date()
): boolean {
	return resolveTenantPublicView(company, now) === "open";
}
