import { TENANT_ADMIN_TAB_IDS, type TenantAdminTabId } from "./tenant-admin-tabs";
import { extractCeoTabsFromPlanFeatures } from "../plans/tenant-plan-features";

const TAB_ID_SET = new Set<string>(TENANT_ADMIN_TAB_IDS);

function normalizeTabId(value: string): TenantAdminTabId | null {
	const normalized = value.trim().toLowerCase();
	const mapped = normalized === "drinks" ? "beverages" : normalized;
	if (!TAB_ID_SET.has(mapped)) return null;
	return mapped as TenantAdminTabId;
}

function uniqueTabs(values: string[]): TenantAdminTabId[] {
	const out: TenantAdminTabId[] = [];
	const seen = new Set<string>();
	for (const value of values) {
		const clean = normalizeTabId(value);
		if (!clean || seen.has(clean)) continue;
		seen.add(clean);
		out.push(clean);
	}
	return out;
}

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
