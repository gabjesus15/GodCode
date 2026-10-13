import { uniqueTabs, type TenantAdminTabId } from "@/lib/super-admin/tenant-admin-tabs";

/**
 * Pestañas del panel que desbloquea un extra (`addons.unlocks_tabs`). El panel del negocio
 * las suma a las del plan mientras el extra esté activo y sin vencer. Solo se guardan ids
 * conocidos (`TENANT_ADMIN_TAB_OPTIONS`): lo demás el panel no sabría mostrarlo.
 */
export function sanitizeAddonUnlockTabs(raw: unknown): TenantAdminTabId[] {
	if (!Array.isArray(raw)) return [];
	return uniqueTabs(raw.filter((tab): tab is string => typeof tab === "string"));
}

const PANEL_MODULE = /^[a-z0-9][a-z0-9-]{1,48}$/;

/**
 * Módulo del panel de caja que abre un extra (`addons.panel_module`): el nombre de su carpeta
 * en `GodCode-Panel/src/addons/`. Mismo formato que el `check` de la tabla; vacío o inválido
 * es `null` (el extra es un servicio sin pantalla).
 */
export function sanitizePanelModule(raw: unknown): string | null {
	const value = String(raw ?? "").trim().toLowerCase();
	return PANEL_MODULE.test(value) ? value : null;
}
