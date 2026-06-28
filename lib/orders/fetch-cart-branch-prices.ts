import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchProductPriceRow } from "@/components/tenant/cart/utils/cart-pricing";

type LegacyPriceRow = {
	product_id: string;
	price: number;
	has_discount: boolean;
	discount_price: number;
	products?:
		| {
				id: string;
				name?: string | null;
				is_active?: boolean | null;
				description?: string | null;
		  }
		| {
				id: string;
				name?: string | null;
				is_active?: boolean | null;
				description?: string | null;
		  }[]
		| null;
};

function normalizeProductJoin(
	products: LegacyPriceRow["products"],
): { id: string; name?: string | null; is_active?: boolean | null; description?: string | null } | undefined {
	if (products == null) return undefined;
	const row = Array.isArray(products) ? products[0] : products;
	if (!row || typeof row !== "object") return undefined;
	return {
		id: String((row as { id: unknown }).id),
		name: (row as { name?: string | null }).name ?? null,
		is_active: (row as { is_active?: boolean | null }).is_active ?? null,
		description: (row as { description?: string | null }).description ?? null,
	};
}

function mapRpcRow(row: Record<string, unknown>): BranchProductPriceRow {
	return {
		product_id: String(row.product_id ?? ""),
		price: Number(row.price),
		has_discount: Boolean(row.has_discount),
		discount_price: Number(row.discount_price),
		products: {
			id: String(row.product_id ?? ""),
			name: (row.product_name as string | null | undefined) ?? null,
			is_active: (row.product_is_active as boolean | null | undefined) ?? null,
			description: (row.product_description as string | null | undefined) ?? null,
		},
	};
}

/**
 * Precios de carrito por sucursal (misma lógica que el menú público / RPC de checkout).
 */
export async function fetchCartBranchPrices(
	supabase: SupabaseClient,
	branchId: string,
	productIds: string[],
): Promise<BranchProductPriceRow[]> {
	const ids = [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))];
	if (!branchId || ids.length === 0) return [];

	const rpc = await supabase.rpc("get_cart_branch_prices", {
		p_branch_id: branchId,
		p_product_ids: ids,
	});

	if (!rpc.error && Array.isArray(rpc.data)) {
		return (rpc.data as Record<string, unknown>[]).map(mapRpcRow);
	}

	const [{ data: prices, error: pricesError }, { data: branchRows, error: branchError }] =
		await Promise.all([
			supabase
				.from("product_prices")
				.select(
					"product_id, price, has_discount, discount_price, products(id,name,is_active,description)",
				)
				.in("product_id", ids)
				.eq("branch_id", branchId)
				.eq("is_active", true),
			supabase
				.from("product_branch")
				.select("product_id")
				.eq("branch_id", branchId)
				.eq("is_active", true)
				.in("product_id", ids),
		]);

	if (pricesError) throw pricesError;
	if (branchError) throw branchError;

	const activeBranchIds = new Set(
		(branchRows ?? []).map((row) => String((row as { product_id: string }).product_id)),
	);

	return (prices ?? [])
		.filter((row: LegacyPriceRow) => activeBranchIds.has(String(row.product_id)))
		.map((row: LegacyPriceRow) => {
			const meta = normalizeProductJoin(row.products);
			return {
				product_id: String(row.product_id),
				price: Number(row.price),
				has_discount: Boolean(row.has_discount),
				discount_price: Number(row.discount_price),
				products: meta
					? {
							id: meta.id,
							name: meta.name ?? null,
							is_active: meta.is_active ?? null,
							description: meta.description ?? null,
						}
					: undefined,
			};
		});
}
