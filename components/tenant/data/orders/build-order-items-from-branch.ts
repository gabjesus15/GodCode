import type { SupabaseClient } from "@supabase/supabase-js";

/** Línea de carrito enviada al servicio (producto catálogo por UUID). */
export interface OrderCatalogLine {
	id: string;
	name: string;
	quantity: number;
	price: number;
	has_discount?: boolean;
	discount_price?: number | null;
	description?: string | null;
	extras_total?: number;
	extras?: Array<{ id: string; name: string; price: number; qty: number }>;
	custom_item?: boolean;
}

interface ProductPriceRow {
	product_id: string;
	price: number | null;
	has_discount: boolean | null;
	discount_price: number | null;
}

interface ProductBranchRow {
	product_id: string;
}

interface ProductRow {
	id: string;
	name: string | null;
}

function isUuidLike(v: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/** Línea de catálogo (UUID) enviada al checkout, excluye extras sintéticos del carrito. */
export function isCatalogOrderLine(item: OrderCatalogLine): boolean {
	if (item.custom_item === true) return false;
	return isUuidLike(String(item.id ?? ""));
}

/** Normaliza extras enviados desde el cliente para RPC / ítems personalizados. */
export function normalizeExtrasPayload(
	raw: unknown,
): Array<{ id: string; name: string; price: number; qty: number }> {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((x) => x && typeof x === "object")
		.map((x) => {
			const o = x as Record<string, unknown>;
			return {
				id: String(o.id ?? ""),
				name: String(o.name ?? "Extra"),
				price: Math.max(0, Math.round(Number(o.price) || 0)),
				qty: Math.max(1, Math.round(Number(o.qty) || 1)),
			};
		})
		.filter((x) => x.id.trim().length > 0);
}

/**
 * Valida productos contra sucursal en batch (precios + membership + nombres).
 */
export async function buildOrderItemsFromBranch(
	supabase: SupabaseClient,
	branchId: string,
	items: OrderCatalogLine[],
): Promise<OrderCatalogLine[]> {
	const requestedLines = items
		.filter((item) => Boolean(item?.id) && isUuidLike(String(item.id)))
		.map((item) => ({
			productId: String(item.id),
			quantity: Math.max(1, Number(item.quantity) || 1),
			description: item.description ?? null,
			extras_total: Math.max(0, Math.round(Number(item.extras_total) || 0)),
			extras: normalizeExtrasPayload(item.extras),
		}));

	const requestedIds = [...new Set(requestedLines.map((l) => l.productId))];
	if (requestedIds.length === 0) return [];

	const [
		{ data: prices, error: pricesError },
		{ data: branchRows, error: branchError },
		{ data: products, error: productsError },
	] = await Promise.all([
		supabase
			.from("product_prices")
			.select("product_id, price, has_discount, discount_price")
			.eq("branch_id", branchId)
			.eq("is_active", true)
			.in("product_id", requestedIds),
		supabase
			.from("product_branch")
			.select("product_id")
			.eq("branch_id", branchId)
			.eq("is_active", true)
			.in("product_id", requestedIds),
		supabase.from("products").select("id, name").eq("is_active", true).in("id", requestedIds),
	]);

	if (pricesError || branchError || productsError) {
		throw new Error("No se pudo validar los productos de la sucursal. Intenta nuevamente.");
	}

	const typedPrices = (prices ?? []) as ProductPriceRow[];
	const typedBranchRows = (branchRows ?? []) as ProductBranchRow[];
	const typedProducts = (products ?? []) as ProductRow[];

	const pricesByProduct = new Map(typedPrices.map((row) => [String(row.product_id), row]));
	const activeBranchProducts = new Set(typedBranchRows.map((row) => String(row.product_id)));
	const productNames = new Map(typedProducts.map((row) => [String(row.id), row.name]));

	const normalizedItems: OrderCatalogLine[] = [];

	for (const line of requestedLines) {
		const { productId } = line;
		if (!activeBranchProducts.has(productId)) continue;

		const dbPriceRow = pricesByProduct.get(productId);
		if (!dbPriceRow) continue;

		const basePrice = Number(dbPriceRow.price || 0);
		const discountPrice = Number(dbPriceRow.discount_price || 0);
		const hasDiscount = Boolean(dbPriceRow.has_discount) && discountPrice > 0;
		const effectivePrice = hasDiscount ? discountPrice : basePrice;
		if (!Number.isFinite(effectivePrice) || effectivePrice <= 0) continue;

		// El RPC (`validate_and_normalize_order_items`) compara el `price` del cliente contra el
		// precio BASE del catálogo (`product_prices.price`) y aplica el descuento por su cuenta.
		// Si aplanáramos a `effectivePrice` con `has_discount:false`, un producto con descuento
		// dispararía `invalid_item_price`. Enviamos base + flags reales para que calce.
		normalizedItems.push({
			id: productId,
			name: String(productNames.get(productId) || "Producto"),
			quantity: line.quantity,
			price: basePrice,
			has_discount: hasDiscount,
			discount_price: hasDiscount ? discountPrice : null,
			description: line.description,
			// Recalculate from extras lines — never trust client extras_total alone.
			extras_total: line.extras.reduce(
				(sum, extra) => sum + Math.max(0, extra.price) * Math.max(1, extra.qty),
				0,
			),
			extras: line.extras,
		});
	}

	return normalizedItems;
}
