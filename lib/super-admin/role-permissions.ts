import { TENANT_ADMIN_TAB_OPTIONS, uniqueTabs, type TenantAdminTabId } from "./tenant-admin-tabs";

/**
 * Permisos por rol del panel del local, editables en Configuración → Roles y guardados en
 * `role_definitions.nav_tabs` / `role_definitions.actions` (sql/2026-10-16_role_permissions.sql).
 *
 * Las claves de acción son las mismas en la base (`role_can`) y en GodCode-Panel
 * (`src/modules/cash/utils/rolePermissions.js`): si se agrega una, va en los tres lados.
 */
export const ROLE_ACTION_OPTIONS = [
	{
		key: "loyalty_rewards.manage",
		label: "Recompensas por puntos",
		description: "Crear, editar, activar y borrar las recompensas que se canjean con puntos.",
	},
	{
		key: "orders.refund",
		label: "Reembolsos",
		description: "Devolver dinero de un pago ya registrado en un pedido.",
	},
	{
		key: "orders.delivery_fee_override",
		label: "Costo de envío a mano",
		description: "Cambiar el costo de envío calculado al crear o editar un pedido.",
	},
	{
		key: "coupons.send_email",
		label: "Cupones por correo",
		description: "Enviar cupones por correo a las cuentas de clientes del menú.",
	},
] as const;

export type RoleActionKey = (typeof ROLE_ACTION_OPTIONS)[number]["key"];

const ACTION_KEYS = new Set<string>(ROLE_ACTION_OPTIONS.map((a) => a.key));

/** Ven y hacen todo siempre: sus permisos no se leen de la tabla ni se pueden editar. */
export const FULL_ACCESS_ROLES = new Set(["admin", "ceo", "super_admin"]);

/** El panel del local no tiene estas pestañas (el equipo y los métodos de pago se manejan aparte). */
const NOT_IN_TENANT_PANEL = new Set<string>(["users", "payment_methods"]);

export const ROLE_TAB_OPTIONS = TENANT_ADMIN_TAB_OPTIONS.filter((tab) => !NOT_IN_TENANT_PANEL.has(tab.id));

const ROLE_TAB_IDS = new Set<string>(ROLE_TAB_OPTIONS.map((tab) => tab.id));

export function isFullAccessRole(name: string | null | undefined): boolean {
	return FULL_ACCESS_ROLES.has(String(name ?? "").trim().toLowerCase());
}

/** Pestañas conocidas del panel, sin repetir; lo demás se descarta. */
export function sanitizeRoleNavTabs(values: unknown): TenantAdminTabId[] {
	if (!Array.isArray(values)) return [];
	const strings = values.filter((v): v is string => typeof v === "string");
	return uniqueTabs(strings).filter((id) => ROLE_TAB_IDS.has(id));
}

/** Acciones conocidas, sin repetir; lo demás se descarta. */
export function sanitizeRoleActions(values: unknown): RoleActionKey[] {
	if (!Array.isArray(values)) return [];
	const out: RoleActionKey[] = [];
	for (const value of values) {
		const key = typeof value === "string" ? value.trim() : "";
		if (ACTION_KEYS.has(key) && !out.includes(key as RoleActionKey)) out.push(key as RoleActionKey);
	}
	return out;
}
