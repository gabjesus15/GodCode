import type { TenantAdminTabId } from "../super-admin/tenant-admin-tabs";
import type { OrderChannelMode } from "../tenant/menu-settings";
import { toPlainRecord } from "./plan-tokens";

/**
 * Qué producto de Gcode trae un plan (`plans.features.product_mode`).
 *
 * - `full`: menú digital y panel CEO completos (lo de siempre; también si la clave falta).
 * - `menu_only`: solo menú digital. Los pedidos llegan al WhatsApp del dueño y el panel
 *   CEO queda reducido a cargar productos y banners.
 * - `panel_only`: solo panel CEO, completo, sin menú público.
 */
export type PlanProductMode = "full" | "menu_only" | "panel_only";

export const PLAN_PRODUCT_MODES: PlanProductMode[] = ["full", "menu_only", "panel_only"];

export const PLAN_PRODUCT_MODE_KEY = "product_mode";

export const PLAN_PRODUCT_MODE_LABELS: Record<PlanProductMode, { title: string; description: string }> = {
	full: {
		title: "Menú digital y panel CEO",
		description: "Todo incluido: menú público con pedidos y panel completo.",
	},
	menu_only: {
		title: "Solo menú digital",
		description:
			"Los pedidos llegan por WhatsApp al dueño. En el panel CEO solo carga productos y banners.",
	},
	panel_only: {
		title: "Solo panel CEO",
		description: "Panel completo (caja, pedidos, reportes) sin menú público.",
	},
};

/**
 * Pestañas del panel CEO con «solo menú digital»: el catálogo (productos, categorías,
 * bebidas, extras y cambios por producto) y los banners del carrusel.
 */
export const MENU_ONLY_CEO_TABS: TenantAdminTabId[] = [
	"categories",
	"products",
	"beverages",
	"extras",
	"menu_modifiers",
	"menu_carousel",
];

export function isPlanProductMode(value: unknown): value is PlanProductMode {
	return typeof value === "string" && PLAN_PRODUCT_MODES.includes(value as PlanProductMode);
}

/** Modo del plan a partir de `plans.features`; `full` si no está definido o es inválido. */
export function resolvePlanProductMode(planFeatures: unknown): PlanProductMode {
	const value = toPlainRecord(planFeatures)[PLAN_PRODUCT_MODE_KEY];
	return isPlanProductMode(value) ? value : "full";
}

/** Escribe el modo en `features`; con `full` la clave se borra (es el valor por omisión). */
export function upsertPlanProductMode(features: unknown, mode: PlanProductMode): Record<string, unknown> {
	const next = toPlainRecord(features);
	if (mode === "full") delete next[PLAN_PRODUCT_MODE_KEY];
	else next[PLAN_PRODUCT_MODE_KEY] = mode;
	return next;
}

/** `false` con «solo panel CEO»: el negocio no tiene menú ni página pública. */
export function planHasPublicMenu(planFeatures: unknown): boolean {
	return resolvePlanProductMode(planFeatures) !== "panel_only";
}

/**
 * Canal de pedidos que vale de verdad. Con «solo menú digital» no hay panel donde recibir
 * pedidos, así que todo va por WhatsApp aunque el ajuste guardado diga otra cosa
 * (el menú de demostración se respeta).
 */
export function resolvePlanOrderChannel(planFeatures: unknown, orderChannel: OrderChannelMode): OrderChannelMode {
	if (orderChannel === "demo") return orderChannel;
	return resolvePlanProductMode(planFeatures) === "menu_only" ? "whatsapp_only" : orderChannel;
}

/** `plans.features` del join `companies → plans` (objeto o arreglo según el cliente de Supabase). */
export function companyPlanFeatures(company: { plans?: unknown } | null | undefined): unknown {
	const plans = company?.plans;
	const row = Array.isArray(plans) ? plans[0] : plans;
	if (!row || typeof row !== "object") return null;
	return (row as { features?: unknown }).features ?? null;
}

/** El negocio tiene menú y páginas públicas (todo menos «solo panel CEO»). */
export function companyHasPublicMenu(company: { plans?: unknown } | null | undefined): boolean {
	return planHasPublicMenu(companyPlanFeatures(company));
}
