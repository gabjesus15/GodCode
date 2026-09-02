/**
 * Scopes de sesión Supabase. Cada uno tiene su propia cookie y su propio storage,
 * de modo que las tres sesiones posibles conviven sin pisarse:
 *
 * - `super-admin`  → panel del SaaS (/login, /dashboard, /companies, /cuenta…)
 * - `tenant`       → panel del negocio (POS, en otro repositorio)
 * - `menu-client`  → cliente final del menú público (/mi-cuenta)
 *
 * El aislamiento de `menu-client` no es cosmético: las políticas RLS que dejan leer
 * el menú público son `TO anon`, así que si una sesión de cliente aterrizara en la
 * cookie `tenant` el rol pasaría a `authenticated`, esas políticas dejarían de
 * aplicar y **el menú devolvería cero filas**.
 *
 * Los mapas son `Record<SupabaseAuthScope, string>` a propósito: si algún día se
 * agrega un scope, la compilación falla en todos los consumidores en vez de que el
 * scope nuevo caiga en silencio en la rama `else` de un ternario.
 */
export type SupabaseAuthScope = "super-admin" | "tenant" | "menu-client";

export const AUTH_COOKIE_NAMES: Record<SupabaseAuthScope, string> = {
	"super-admin": "sb-super-admin-auth-token",
	tenant: "sb-tenant-auth-token",
	"menu-client": "sb-menu-client-auth-token",
};

export const AUTH_STORAGE_KEYS: Record<SupabaseAuthScope, string> = {
	"super-admin": "sb-super-admin-auth-storage",
	tenant: "sb-tenant-auth-storage",
	"menu-client": "sb-menu-client-auth-storage",
};

/**
 * Scopes de los paneles internos. El logout global (`/api/auth/signout`) solo debe
 * cerrar estos: si además cerrara `menu-client`, un empleado que estuviera navegando
 * el menú como cliente perdería esa sesión al salir del panel, y viceversa.
 */
export const PANEL_AUTH_SCOPES: SupabaseAuthScope[] = ["super-admin", "tenant"];

export function getAuthCookieName(scope: SupabaseAuthScope): string {
	return AUTH_COOKIE_NAMES[scope];
}

export function getAuthStorageKey(scope: SupabaseAuthScope): string {
	return AUTH_STORAGE_KEYS[scope];
}
