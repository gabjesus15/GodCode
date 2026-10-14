/**
 * Reglas para ganar puntos (`loyalty_earn_rules`), sin "server-only": las usan el
 * editor del Portal (/cuenta › Mi menú) y Mi Cuenta del menú para describirlas.
 *
 * Cómo se calculan los puntos de un pedido vive en la base
 * (`loyalty_points_for_order`, sql/2026-10-14_loyalty_earn_rules.sql):
 *   - Global: se suman las reglas globales; si hay una promoción vigente del mismo modo,
 *     reemplaza a las permanentes de ese modo.
 *   - Por producto del pedido: una sola regla, la más específica (promo del producto >
 *     producto > promo de la categoría > categoría), por unidad. Se suma a lo global.
 * Cada pedido guarda lo que ganó al crearse: cambiar las reglas no toca lo ya ganado.
 */
import { z } from "zod";

export type LoyaltyRuleScope = "global" | "product" | "category";
export type LoyaltyRuleMode = "per_amount" | "per_order";

export type LoyaltyEarnRule = {
	id: string;
	name: string | null;
	scope: LoyaltyRuleScope;
	/** Solo global. */
	mode: LoyaltyRuleMode | null;
	points: number;
	/** Solo global por monto: `points` por cada `perAmount` gastado. */
	perAmount: number | null;
	productId: string | null;
	productName: string | null;
	categoryId: string | null;
	categoryName: string | null;
	startsAt: string | null;
	endsAt: string | null;
	isActive: boolean;
};

/** Con fechas es una promoción: mientras dura, reemplaza a la regla permanente de su nivel. */
export function isPromoRule(rule: Pick<LoyaltyEarnRule, "startsAt" | "endsAt">): boolean {
	return Boolean(rule.startsAt || rule.endsAt);
}

/** Activa y dentro de sus fechas (si tiene). */
export function isRuleLive(
	rule: Pick<LoyaltyEarnRule, "isActive" | "startsAt" | "endsAt">,
	now: number = Date.now(),
): boolean {
	if (!rule.isActive) return false;
	if (rule.startsAt && new Date(rule.startsAt).getTime() > now) return false;
	if (rule.endsAt && new Date(rule.endsAt).getTime() < now) return false;
	return true;
}

/** Ya pasó su fecha de fin: no vuelve a aplicar. */
export function isRuleExpired(rule: Pick<LoyaltyEarnRule, "endsAt">, now: number = Date.now()): boolean {
	return Boolean(rule.endsAt && new Date(rule.endsAt).getTime() < now);
}

const isoDate = z
	.string()
	.trim()
	.refine((value) => !Number.isNaN(new Date(value).getTime()), "Fecha inválida.");

/** Lo que manda el editor del Portal al crear o editar una regla. */
export const loyaltyEarnRuleInputSchema = z
	.object({
		name: z.string().trim().max(80).nullable().optional(),
		scope: z.enum(["global", "product", "category"]),
		mode: z.enum(["per_amount", "per_order"]).nullable().optional(),
		points: z.number().int().min(0).max(1_000_000),
		perAmount: z.number().positive().max(100_000_000).nullable().optional(),
		productId: z.string().uuid().nullable().optional(),
		categoryId: z.string().uuid().nullable().optional(),
		startsAt: isoDate.nullable().optional(),
		endsAt: isoDate.nullable().optional(),
		isActive: z.boolean().optional(),
	})
	.superRefine((rule, ctx) => {
		const issue = (message: string) => ctx.addIssue({ code: "custom", message });
		if (rule.scope === "global") {
			if (!rule.mode) issue("Elige si la regla es por dinero gastado o por compra.");
			if (rule.mode === "per_amount" && !rule.perAmount) issue("Indica cada cuánto gastado se gana.");
			if (rule.points <= 0) issue("Los puntos deben ser mayores que 0.");
		}
		if (rule.scope === "product" && !rule.productId) issue("Elige el producto.");
		if (rule.scope === "category" && !rule.categoryId) issue("Elige la categoría.");
		if (rule.startsAt && rule.endsAt && new Date(rule.endsAt) <= new Date(rule.startsAt)) {
			issue("La fecha de fin debe ser posterior a la de inicio.");
		}
	});

export type LoyaltyEarnRuleInput = z.infer<typeof loyaltyEarnRuleInputSchema>;

/** Columnas de la base a partir de lo validado: lo que no corresponde al alcance va en null. */
export function earnRuleInputToRow(input: LoyaltyEarnRuleInput) {
	const global = input.scope === "global";
	return {
		name: input.name?.trim() || null,
		scope: input.scope,
		mode: global ? (input.mode ?? null) : null,
		points: input.points,
		per_amount: global && input.mode === "per_amount" ? (input.perAmount ?? null) : null,
		product_id: input.scope === "product" ? (input.productId ?? null) : null,
		category_id: input.scope === "category" ? (input.categoryId ?? null) : null,
		starts_at: input.startsAt || null,
		ends_at: input.endsAt || null,
		is_active: input.isActive ?? true,
	};
}
