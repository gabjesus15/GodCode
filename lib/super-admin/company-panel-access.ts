import { uniqueTabs, type TenantAdminTabId } from "./tenant-admin-tabs";
import { extractCeoTabsFromPlanFeatures } from "../plans/tenant-plan-features";

function toArrayFromUnknown(raw: unknown): string[] {
	if (!Array.isArray(raw)) return [];
	return raw.filter((value): value is string => typeof value === "string");
}

export function normalizeCompanyPanelAccess(raw: unknown): TenantAdminTabId[] {
	if (Array.isArray(raw)) {
		return uniqueTabs(toArrayFromUnknown(raw));
	}

	if (!raw || typeof raw !== "object") return [];

	const source = raw as Record<string, unknown>;
	if (Array.isArray(source.panelAccess)) {
		return uniqueTabs(toArrayFromUnknown(source.panelAccess));
	}

	if (Array.isArray(source.company_tabs)) {
		return uniqueTabs(toArrayFromUnknown(source.company_tabs));
	}

	if (Array.isArray(source.companyAccess)) {
		return uniqueTabs(toArrayFromUnknown(source.companyAccess));
	}

	if (Array.isArray(source.roleNavPermissions)) {
		return uniqueTabs(toArrayFromUnknown(source.roleNavPermissions));
	}

	if (typeof source.roleNavPermissions === "object" && source.roleNavPermissions !== null) {
		const legacy = Object.values(source.roleNavPermissions as Record<string, unknown>).flatMap((tabs) =>
			toArrayFromUnknown(tabs)
		);
		return uniqueTabs(legacy);
	}

	return [];
}

export function buildCompanyPanelAccessFromPlanFeatures(planFeatures: unknown): TenantAdminTabId[] {
	const planTabs = extractCeoTabsFromPlanFeatures(planFeatures);
	return planTabs ? [...planTabs] : [];
}
