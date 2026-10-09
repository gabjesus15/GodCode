import type { PlanProductMode } from "./plan-product-mode";
import { toPlainRecord } from "./plan-tokens";

/**
 * Cómo se presentan los planes en la landing: qué planes van juntos en una tarjeta
 * (variantes) y cuál lleva la insignia «Recomendado». El modo de producto de cada plan
 * (`plans.features.product_mode`) se lee en `plan-product-mode`.
 */

/** Separador con el que el super admin nombra las variantes de un plan («Básico · Menú digital»). */
const VARIANT_SEPARATOR = " · ";

/** Etiqueta corta del selector de la tarjeta. Las variantes sin modo usan lo que va después del separador. */
const MODE_LABELS: Record<Exclude<PlanProductMode, "full">, string> = {
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
export function groupPlanVariants<T extends { name: string; productMode: PlanProductMode }>(
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

/** Clave en `plans.features`: el dueño marca desde el súper admin qué plan recomienda. */
export const PLAN_RECOMMENDED_KEY = "recommended";

/** `true` solo si el plan está marcado como recomendado en sus `features`. */
export function isPlanRecommended(planFeatures: unknown): boolean {
	return toPlainRecord(planFeatures)[PLAN_RECOMMENDED_KEY] === true;
}

/** Escribe la marca en `features`; sin ella la clave se borra (es el valor por omisión). */
export function upsertPlanRecommended(features: unknown, recommended: boolean): Record<string, unknown> {
	const next = toPlainRecord(features);
	if (recommended) next[PLAN_RECOMMENDED_KEY] = true;
	else delete next[PLAN_RECOMMENDED_KEY];
	return next;
}

/** Índice de la tarjeta del medio: ahí cae «Recomendado» mientras ningún plan esté marcado. */
export function popularPlanIndex(count: number): number {
	if (count <= 1) return 0;
	return Math.floor(count / 2);
}

/**
 * Tarjeta que lleva la insignia «Recomendado»: la primera (en el orden de la lista) con
 * un plan marcado por el dueño. Si no marcó ninguno, la del medio, como siempre.
 */
export function recommendedGroupIndex<T extends { recommended?: boolean }>(groups: PlanGroup<T>[]): number {
	const marked = groups.findIndex((group) => group.variants.some(({ plan }) => plan.recommended === true));
	return marked >= 0 ? marked : popularPlanIndex(groups.length);
}
