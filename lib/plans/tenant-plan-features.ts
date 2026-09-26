import {
	uniqueTabs,
	type TenantAdminTabId,
} from "../super-admin/tenant-admin-tabs";
import { toPlainRecord } from "./plan-tokens";

const LEGACY_FEATURE_TABS: Record<string, TenantAdminTabId[]> = {
	menu: ["categories", "products", "beverages", "extras", "inventory"],
	cash: ["orders", "caja", "payment_methods"],
	crm: ["analytics", "clients", "users"],
};

/**
 * Devuelve tabs de CEO definidos en `features.ceo_tabs` o deducidos desde flags legacy (`crm/cash/menu`).
 * Retorna `null` si no hay definición en features.
 */
export function extractCeoTabsFromPlanFeatures(features: unknown): TenantAdminTabId[] | null {
	const safe = toPlainRecord(features);

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
	const safe = toPlainRecord(features);
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
