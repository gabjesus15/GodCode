import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";

import {
	earnRuleInputToRow,
	type LoyaltyEarnRule,
	type LoyaltyEarnRuleInput,
	type LoyaltyRuleMode,
	type LoyaltyRuleScope,
} from "./earn-rules-shared";

/** Error con mensaje para el CEO; el resto se registra y se responde genérico. */
export class LoyaltyRuleError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
		this.name = "LoyaltyRuleError";
	}
}

const RULE_SELECT =
	"id, name, scope, mode, points, per_amount, product_id, category_id, starts_at, ends_at, is_active, created_at, product:products(name), category:categories(name)";

type RuleRow = {
	id: string;
	name: string | null;
	scope: string;
	mode: string | null;
	points: number;
	per_amount: number | null;
	product_id: string | null;
	category_id: string | null;
	starts_at: string | null;
	ends_at: string | null;
	is_active: boolean;
	product: { name: string } | { name: string }[] | null;
	category: { name: string } | { name: string }[] | null;
};

function one<T>(value: T | T[] | null): T | null {
	return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toRule(row: RuleRow): LoyaltyEarnRule {
	return {
		id: row.id,
		name: row.name,
		scope: row.scope as LoyaltyRuleScope,
		mode: (row.mode as LoyaltyRuleMode | null) ?? null,
		points: Number(row.points) || 0,
		perAmount: row.per_amount == null ? null : Number(row.per_amount),
		productId: row.product_id,
		productName: one(row.product)?.name ?? null,
		categoryId: row.category_id,
		categoryName: one(row.category)?.name ?? null,
		startsAt: row.starts_at,
		endsAt: row.ends_at,
		isActive: row.is_active,
	};
}

function fail(event: string, message: string): never {
	logger.error(event, { message });
	throw new LoyaltyRuleError(500, "No se pudo completar la operación. Intenta de nuevo.");
}

/** Reglas del negocio. `onlyActive` deja las activas que no vencieron (lo que ve el cliente). */
export async function listEarnRules(companyId: string, options: { onlyActive?: boolean } = {}): Promise<LoyaltyEarnRule[]> {
	let query = supabaseAdmin
		.from("loyalty_earn_rules")
		.select(RULE_SELECT)
		.eq("company_id", companyId)
		.order("scope", { ascending: true })
		.order("created_at", { ascending: true });
	if (options.onlyActive) {
		query = query.eq("is_active", true).or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`);
	}
	const { data, error } = await query;
	if (error) fail("loyalty_rules_list_failed", error.message);
	return ((data ?? []) as unknown as RuleRow[]).map(toRule);
}

export type LoyaltyCatalog = {
	products: Array<{ id: string; name: string; categoryId: string | null }>;
	categories: Array<{ id: string; name: string }>;
};

/** Productos y categorías del negocio, para los buscadores del editor. */
export async function listLoyaltyCatalog(companyId: string): Promise<LoyaltyCatalog> {
	const [products, categories] = await Promise.all([
		supabaseAdmin.from("products").select("id, name, category_id").eq("company_id", companyId).order("name"),
		supabaseAdmin.from("categories").select("id, name").eq("company_id", companyId).order("name"),
	]);
	if (products.error) fail("loyalty_catalog_products_failed", products.error.message);
	if (categories.error) fail("loyalty_catalog_categories_failed", categories.error.message);
	return {
		products: (products.data ?? []).map((p) => ({ id: p.id, name: p.name, categoryId: p.category_id })),
		categories: (categories.data ?? []).map((c) => ({ id: c.id, name: c.name })),
	};
}

/** El producto o la categoría de la regla tienen que ser de este negocio. */
async function assertTargetBelongs(companyId: string, input: LoyaltyEarnRuleInput): Promise<void> {
	if (input.scope === "product" && input.productId) {
		const { data } = await supabaseAdmin
			.from("products")
			.select("id")
			.eq("id", input.productId)
			.eq("company_id", companyId)
			.maybeSingle();
		if (!data) throw new LoyaltyRuleError(400, "Ese producto no es de tu negocio.");
	}
	if (input.scope === "category" && input.categoryId) {
		const { data } = await supabaseAdmin
			.from("categories")
			.select("id")
			.eq("id", input.categoryId)
			.eq("company_id", companyId)
			.maybeSingle();
		if (!data) throw new LoyaltyRuleError(400, "Esa categoría no es de tu negocio.");
	}
}

export async function createEarnRule(companyId: string, input: LoyaltyEarnRuleInput): Promise<LoyaltyEarnRule> {
	await assertTargetBelongs(companyId, input);
	const { data, error } = await supabaseAdmin
		.from("loyalty_earn_rules")
		.insert({ company_id: companyId, ...earnRuleInputToRow(input) })
		.select(RULE_SELECT)
		.single();
	if (error) fail("loyalty_rule_create_failed", error.message);
	return toRule(data as unknown as RuleRow);
}

export async function updateEarnRule(
	companyId: string,
	id: string,
	input: LoyaltyEarnRuleInput,
): Promise<LoyaltyEarnRule> {
	await assertTargetBelongs(companyId, input);
	const { data, error } = await supabaseAdmin
		.from("loyalty_earn_rules")
		.update(earnRuleInputToRow(input))
		.eq("id", id)
		.eq("company_id", companyId)
		.select(RULE_SELECT)
		.maybeSingle();
	if (error) fail("loyalty_rule_update_failed", error.message);
	if (!data) throw new LoyaltyRuleError(404, "Esa regla ya no existe.");
	return toRule(data as unknown as RuleRow);
}

export async function deleteEarnRule(companyId: string, id: string): Promise<void> {
	const { error } = await supabaseAdmin.from("loyalty_earn_rules").delete().eq("id", id).eq("company_id", companyId);
	if (error) fail("loyalty_rule_delete_failed", error.message);
}
