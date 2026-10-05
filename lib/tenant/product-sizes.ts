/**
 * Tamaños de producto ("Familiar", "Mediana"…). Cada tamaño tiene su propio precio por
 * sucursal (`product_sizes`) y REEMPLAZA el precio del producto; la oferta del producto
 * no aplica a una línea con tamaño. La RPC `validate_and_normalize_order_items` hace la
 * misma cuenta y nombra la línea con `composeSizedName`.
 */

export type ProductSizeOption = {
	id: string;
	name: string;
	price: number;
};

/** Columnas que se leen de `product_sizes`. */
export const PRODUCT_SIZES_SELECT = "id, product_id, name, price, sort_order";

type RawSizeRow = {
	id?: unknown;
	product_id?: unknown;
	name?: unknown;
	price?: unknown;
	sort_order?: unknown;
};

/**
 * Nombre de una línea con tamaño y/o variantes. Mismo formato que la RPC:
 * "Pizza (Familiar)", "Pizza (Familiar, Pollo)", "Hamburguesa (Mixta)".
 */
export function composeLineName(productName: string | null | undefined, parts: Array<string | null | undefined>): string {
	const base = String(productName ?? "").trim();
	const labels = parts.map((part) => String(part ?? "").trim()).filter(Boolean);
	if (labels.length === 0) return base;
	const suffix = labels.join(", ");
	return base ? `${base} (${suffix})` : suffix;
}

/** Nombre de una línea con tamaño. Mismo formato que la RPC: "Pizza (Familiar)". */
export function composeSizedName(productName: string | null | undefined, sizeName: string): string {
	return composeLineName(productName, [sizeName]);
}

/**
 * Agrupa filas de `product_sizes` por producto, en el orden del panel. Descarta filas
 * sin id, sin nombre o con precio no positivo (la RPC tampoco las aceptaría).
 */
export function groupProductSizeRows(raw: unknown): Map<string, ProductSizeOption[]> {
	const byProduct = new Map<string, Array<ProductSizeOption & { sort: number }>>();
	if (!Array.isArray(raw)) return new Map();
	for (const entry of raw as RawSizeRow[]) {
		if (!entry || typeof entry !== "object") continue;
		const id = String(entry.id ?? "").trim();
		const productId = String(entry.product_id ?? "").trim();
		const name = String(entry.name ?? "").trim();
		const price = Number(entry.price);
		if (!id || !productId || !name || !Number.isFinite(price) || price <= 0) continue;
		const list = byProduct.get(productId) ?? [];
		list.push({ id, name, price, sort: Number(entry.sort_order) || 0 });
		byProduct.set(productId, list);
	}
	const result = new Map<string, ProductSizeOption[]>();
	for (const [productId, list] of byProduct) {
		list.sort((a, b) => a.sort - b.sort || a.price - b.price);
		result.set(
			productId,
			list.map(({ id, name, price }) => ({ id, name, price })),
		);
	}
	return result;
}

/** Precio más bajo entre los tamaños: es el "Desde" del menú. */
export function minSizePrice(sizes: ProductSizeOption[] | null | undefined): number | null {
	if (!sizes || sizes.length === 0) return null;
	return sizes.reduce((min, size) => Math.min(min, size.price), Number.POSITIVE_INFINITY);
}
