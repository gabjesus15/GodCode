export type CartBranchFeatureFlags = {
	extrasEnabledByBranch: boolean;
	beveragesUpsellEnabledByBranch: boolean;
};

/**
 * Resuelve flags de extras / upsell bebidas desde `branch.delivery_settings` u objeto equivalente.
 * Sin React; usable en tests y en el hook del carrito.
 */
export function computeCartBranchFeatureFlags(
	branchDeliverySettings: unknown,
	selectedBranchId?: string | null,
): CartBranchFeatureFlags {
	const raw =
		branchDeliverySettings && typeof branchDeliverySettings === "object" && !Array.isArray(branchDeliverySettings)
			? (branchDeliverySettings as Record<string, unknown>)
			: {};
	const resolveBranchFlag = (value: unknown): boolean => {
		if (value === true) return true;
		if (value === false || value == null) return false;
		if (typeof value === "number") return value === 1;
		if (typeof value === "string") {
			const normalized = value.trim().toLowerCase();
			return normalized === "true" || normalized === "1";
		}
		if (typeof value === "object" && !Array.isArray(value)) {
			const map = value as Record<string, unknown>;
			if (selectedBranchId && resolveBranchFlag(map[selectedBranchId])) {
				return true;
			}
			return Object.values(map).some((entry) => resolveBranchFlag(entry));
		}
		return false;
	};
	const extrasEnabled =
		resolveBranchFlag(raw.extrasEnabledByBranch) || resolveBranchFlag(raw.extras_enabled_by_branch);
	const beveragesEnabled =
		resolveBranchFlag(raw.beveragesUpsellEnabledByBranch) ||
		resolveBranchFlag(raw.beverages_upsell_enabled_by_branch);
	return {
		extrasEnabledByBranch: extrasEnabled,
		beveragesUpsellEnabledByBranch: beveragesEnabled,
	};
}
