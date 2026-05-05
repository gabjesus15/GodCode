import {
	DEFAULT_ROLE_NAV_PERMISSIONS,
	TENANT_ADMIN_TAB_IDS,
	type TenantAdminTabId,
} from "../super-admin/tenant-admin-tabs";

type RoleNavPermissions = Record<string, string[]>;

const TAB_ID_SET = new Set<string>(TENANT_ADMIN_TAB_IDS);

const LEGACY_FEATURE_TABS: Record<string, TenantAdminTabId[]> = {
	menu: ["categories", "products", "beverages", "extras", "inventory"],
	cash: ["orders", "caja", "payment_methods"],
	crm: ["analytics", "clients", "users"],
};

function sanitizeTabId(value: string): TenantAdminTabId | null {
	const normalized = value.trim().toLowerCase();
	const mapped = normalized === "drinks" ? "beverages" : normalized;
	if (!TAB_ID_SET.has(mapped)) return null;
	return mapped as TenantAdminTabId;
}

function uniqueTabs(values: string[]): TenantAdminTabId[] {
	const out: TenantAdminTabId[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const clean = sanitizeTabId(value);
		if (!clean || seen.has(clean)) continue;
		seen.add(clean);
		out.push(clean);
	}
	return out;
}

function toObject(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	return { ...(value as Record<string, unknown>) };
}

/**
 * Devuelve tabs de CEO definidos en `features.ceo_tabs` o deducidos desde flags legacy (`crm/cash/menu`).
 * Retorna `null` si no hay definición en features.
 */
export function extractCeoTabsFromPlanFeatures(features: unknown): TenantAdminTabId[] | null {
	const safe = toObject(features);

	if (Array.isArray(safe.ceo_tabs)) {
		const tabs = uniqueTabs(
			safe.ceo_tabs.filter((tab): tab is string => typeof tab === "string")
		);
		return tabs;
	}

	const legacyTabs: string[] = [];
	for (const [featureKey, tabs] of Object.entries(LEGACY_FEATURE_TABS)) {
		if (safe[featureKey] === true) legacyTabs.push(...tabs);
	}

	if (legacyTabs.length === 0) return null;
	return uniqueTabs(legacyTabs);
}

export function upsertPlanFeaturesCeoTabs(
	features: unknown,
	ceoTabs: string[]
): Record<string, unknown> {
	const safe = toObject(features);
	const normalizedTabs = uniqueTabs(ceoTabs);

	const hasMenu = LEGACY_FEATURE_TABS.menu.some((tab) => normalizedTabs.includes(tab));
	const hasCash = LEGACY_FEATURE_TABS.cash.some((tab) => normalizedTabs.includes(tab));
	const hasCrm = LEGACY_FEATURE_TABS.crm.some((tab) => normalizedTabs.includes(tab));

	return {
		...safe,
		ceo_tabs: normalizedTabs,
		menu: hasMenu,
		cash: hasCash,
		crm: hasCrm,
	};
}

export function buildRoleNavPermissionsFromPlanFeatures(input: {
	basePermissions: RoleNavPermissions;
	planFeatures: unknown;
}): RoleNavPermissions {
	const base = input.basePermissions;
	const planCeoTabs = extractCeoTabsFromPlanFeatures(input.planFeatures);
	if (!planCeoTabs) return base;

	return {
		...base,
		owner: [...(base.owner ?? DEFAULT_ROLE_NAV_PERMISSIONS.owner)],
		admin: [...(base.admin ?? DEFAULT_ROLE_NAV_PERMISSIONS.admin)],
		ceo: [...planCeoTabs],
		cashier: [...(base.cashier ?? DEFAULT_ROLE_NAV_PERMISSIONS.cashier)],
	};
}
