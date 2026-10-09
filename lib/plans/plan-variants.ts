import { toPlainRecord } from "./plan-tokens";

/**
 * Qué producto trae un plan, según `plans.features.product_mode`: menú digital y panel
 * (`full`, también cuando la clave falta), solo menú con pedidos por WhatsApp (`menu_only`)
 * o solo panel CEO sin menú público (`panel_only`).
 */
export type PublicPlanProductMode = "full" | "menu_only" | "panel_only";

export function resolvePublicPlanProductMode(features: unknown): PublicPlanProductMode {
	const value = toPlainRecord(features).product_mode;
	return value === "menu_only" || value === "panel_only" ? value : "full";
}

/** Separador con el que el super admin nombra las variantes de un plan («Básico · Menú digital»). */
const VARIANT_SEPARATOR = " · ";

/** Etiqueta corta del selector de la tarjeta. Las variantes sin modo usan lo que va después del separador. */
const MODE_LABELS: Record<Exclude<PublicPlanProductMode, "full">, string> = {
	menu_only: "Menú",
	panel_only: "Panel",
};

export type PlanVariant<T> = { plan: T; label: string };

export type PlanGroup<T> = {
	/** Nombre base en minúsculas; sirve de `key` al dibujar. */
	key: string;
	/** Lo que la tarjeta muestra como nombre del plan. */
	name: string;
	variants: PlanVariant<T>[];
};

/**
 * Agrupa en una tarjeta los planes que comparten el nombre base: «Básico · Menú digital» y
 * «Básico · Panel CEO» pasan a ser «Básico» con un selector de dos variantes. Solo se agrupan
 * los nombres con separador; un plan llamado «Básico» a secas es siempre su propia tarjeta,
 * y una variante sin pareja conserva su nombre completo. Cada grupo ocupa el lugar de su
 * primera variante, así el orden por precio del listado no cambia.
 */
export function groupPlanVariants<T extends { name: string; productMode: PublicPlanProductMode }>(
	plans: T[],
): PlanGroup<T>[] {
	const groups: PlanGroup<T>[] = [];
	const byKey = new Map<string, PlanGroup<T>>();

	for (const plan of plans) {
		const [base = plan.name, ...rest] = plan.name.split(VARIANT_SEPARATOR);
		const suffix = rest.join(VARIANT_SEPARATOR).trim();
		if (!suffix) {
			groups.push({ key: `plan:${plan.name.toLowerCase()}`, name: plan.name, variants: [{ plan, label: plan.name }] });
			continue;
		}

		const name = base.trim() || plan.name;
		const key = `grupo:${name.toLowerCase()}`;
		const label = plan.productMode === "full" ? suffix : MODE_LABELS[plan.productMode];

		const existing = byKey.get(key);
		if (existing) {
			existing.variants.push({ plan, label });
			continue;
		}
		const group: PlanGroup<T> = { key, name, variants: [{ plan, label }] };
		byKey.set(key, group);
		groups.push(group);
	}

	for (const group of groups) {
		if (group.variants.length === 1) group.name = group.variants[0]!.plan.name;
	}
	return groups;
}
