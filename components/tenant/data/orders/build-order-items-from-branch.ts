import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuidLike } from "../../cart/utils/safe-ids";
import { composeSizedName } from "@/lib/tenant/product-sizes";

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
	/** Marca la línea como extra/bebida (el RPC la valida contra el catálogo JSON, no por UUID). */
	is_extra?: boolean;
	/** Origen del extra para el RPC: `extras` (extra global) o `beverages` (bebida upsell). */
	manual_order_source?: "extras" | "beverages";
	/** Tamaño elegido (`product_sizes.id`): su precio reemplaza al del producto. */
	size_id?: string | null;
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

interface ProductSizeRow {
	id: string;
	product_id: string;
	name: string | null;
	price: number | string | null;
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
			sizeId: item.size_id && isUuidLike(String(item.size_id)) ? String(item.size_id) : null,
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

	const requestedSizeIds = [
		...new Set(requestedLines.map((l) => l.sizeId).filter((id): id is string => Boolean(id))),
	];
	let sizeRows: ProductSizeRow[] = [];
	if (requestedSizeIds.length > 0) {
		const { data: sizes, error: sizesError } = await supabase
			.from("product_sizes")
			.select("id, product_id, name, price")
			.eq("branch_id", branchId)
			.eq("is_active", true)
			.in("id", requestedSizeIds);
		if (sizesError) {
			throw new Error("No se pudo validar los productos de la sucursal. Intenta nuevamente.");
		}
		sizeRows = (sizes ?? []) as ProductSizeRow[];
	}
	const sizesById = new Map(sizeRows.map((row) => [String(row.id), row]));

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

		const extrasTotal = line.extras.reduce(
			(sum, extra) => sum + Math.max(0, extra.price) * Math.max(1, extra.qty),
			0,
		);

		if (line.sizeId) {
			// Tamaño: precio propio, sin oferta. Un tamaño borrado o de otro producto deja la
			// línea fuera (el checkout avisa que el carrito cambió).
			const size = sizesById.get(line.sizeId);
			if (!size || String(size.product_id) !== productId) continue;
			const sizePrice = Number(size.price);
			if (!Number.isFinite(sizePrice) || sizePrice <= 0) continue;
			normalizedItems.push({
				id: productId,
				name: composeSizedName(productNames.get(productId) || "Producto", String(size.name ?? "")),
				quantity: line.quantity,
				price: sizePrice,
				has_discount: false,
				discount_price: null,
				description: line.description,
				extras_total: extrasTotal,
				extras: line.extras,
				size_id: line.sizeId,
			});
			continue;
		}

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
			extras_total: extrasTotal,
			extras: line.extras,
		});
	}

	return normalizedItems;
}
