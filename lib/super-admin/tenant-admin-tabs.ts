/**
 * Única fuente de verdad para los IDs de pestañas del panel del tenant (mismo contrato en todos los clientes).
 * Usado por el panel de roles del SaaS (`company-global-form`: permisos por rol) para mostrar y guardar qué ve cada rol.
 * El panel del tenant donde se apliquen esos permisos (p. ej. app de escritorio) debe usar los mismos `id`.
 *
 * Al agregar una pestaña nueva:
 * 1. Añadirla en TENANT_ADMIN_TAB_OPTIONS.
 * 2. Si solo admin/owner deben verla por defecto, añadir su id a ADMIN_ONLY_TAB_IDS.
 * 3. Reflejarla en el cliente del panel tenant: `AdminSidebar` + contenido cuando `activeTab === id`.
 *
 * Esta lista es el filtro de TODO lo que el super panel puede conceder: lo que no
 * esté aquí lo descarta `sanitizeTabId` antes de guardarse en `features.ceo_tabs`,
 * así que al tenant no le llega y la sección le sale "no habilitada".
 *
 * Sobre los ids: los antiguos (`beverages`, `extras`, `admin_menu_options`) se
 * mantienen porque ya hay planes guardados con ellos; el panel del tenant los
 * traduce en STORED_TAB_ID_ALIASES (admin-panel-tabs.ts). Las pestañas nuevas se
 * añaden con el id canónico del tenant, que no necesita traducción.
 */

/** Pestañas que por defecto no reciben CEO ni cashier (solo owner y admin). */
export const ADMIN_ONLY_TAB_IDS = ["admin_menu_options"] as const;

export const TENANT_ADMIN_TAB_OPTIONS = [
	{ id: "orders", label: "Cocina / Pedidos" },
	{ id: "caja", label: "Caja" },
	{ id: "analytics", label: "Reportes" },
	{ id: "local_expenses", label: "Gastos del local" },
	{ id: "categories", label: "Categorías" },
	/** Catálogo vendible. En el panel del local la pestaña se llama "Menú y carta". */
	{ id: "products", label: "Menú y carta" },
	{ id: "inventory", label: "Inventario" },
	{ id: "beverages", label: "Bebidas" },
	{ id: "extras", label: "Extras" },
	{ id: "menu_carousel", label: "Carrusel" },
	{ id: "admin_menu_options", label: "Opciones de sucursal" },
	{ id: "clients", label: "Clientes" },
	{ id: "users", label: "Equipo" },
	{ id: "payment_methods", label: "Métodos de pago" },
	{ id: "coupons", label: "Cupones" },
] as const;

export const TENANT_ADMIN_TAB_IDS = TENANT_ADMIN_TAB_OPTIONS.map((t) => t.id);

export type TenantAdminTabId = (typeof TENANT_ADMIN_TAB_OPTIONS)[number]["id"];

const ALL_TABS = TENANT_ADMIN_TAB_IDS as unknown as string[];

const adminOnlySet = new Set<string>(ADMIN_ONLY_TAB_IDS as unknown as string[]);

const TABS_FOR_CEO_DEFAULT = ALL_TABS.filter((id) => !adminOnlySet.has(id));

export const DEFAULT_ROLE_NAV_PERMISSIONS: Record<string, string[]> = {
	owner: [...ALL_TABS],
	admin: [...ALL_TABS],
	ceo: [...TABS_FOR_CEO_DEFAULT],
	// Igual que el panel del local: un cajero registra gastos del turno.
	cashier: ["orders", "caja", "local_expenses"],
};

export function getDefaultRoleNavPermissions(): Record<string, string[]> {
	return { ...DEFAULT_ROLE_NAV_PERMISSIONS };
}
