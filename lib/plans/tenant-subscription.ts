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
