/**
 * Variantes de producto: grupos de opción única y obligatoria que cambian el producto
 * principal ("Proteína: carne / pollo / mixta", "Masa: fina / gruesa"). Viven en
 * `product_variants`, por sucursal como los tamaños. A diferencia del tamaño, una
 * variante NO reemplaza el precio: suma `price_delta` (puede ser 0 o negativo) al
 * precio base o al del tamaño elegido, y también a la oferta si la hay. La RPC
 * `validate_and_normalize_order_items` hace la misma cuenta y nombra la línea con
 * `composeLineName` ("Pizza (Familiar, Pollo)").
 *
 * La primera opción de cada grupo (por `sort_order`) es la predeterminada; el menú
 * exige elegir una por grupo antes de agregar.
 */

export type ProductVariantOption = {
	id: string;
	name: string;
	/** Diferencia de precio respecto del producto (0 = incluida). */
	priceDelta: number;
	/** Foto propia de la variante, ya resuelta a URL; null = la foto del producto. */
	imageUrl: string | null;
};

export type ProductVariantGroup = {
	name: string;
	options: ProductVariantOption[];
};

/** Columnas que se leen de `product_variants`. */
export const PRODUCT_VARIANTS_SELECT = "id, product_id, group_name, name, price_delta, image_url, sort_order";

type RawVariantRow = {
	id?: unknown;
	product_id?: unknown;
	group_name?: unknown;
	name?: unknown;
	price_delta?: unknown;
	image_url?: unknown;
	sort_order?: unknown;
};

/**
 * Agrupa filas de `product_variants` por producto y, dentro, por grupo, en el orden del
 * panel. Descarta filas sin id, sin grupo o sin nombre. `resolveImage` convierte la ruta
 * guardada en URL (en el servidor); en el cliente las filas ya vienen resueltas.
 */
export function groupProductVariantRows(
	raw: unknown,
	resolveImage: (value: string | null) => string | null = (value) => value,
): Map<string, ProductVariantGroup[]> {
	type Pending = ProductVariantOption & { group: string; sort: number };
	const byProduct = new Map<string, Pending[]>();
	if (!Array.isArray(raw)) return new Map();
	for (const entry of raw as RawVariantRow[]) {
		if (!entry || typeof entry !== "object") continue;
		const id = String(entry.id ?? "").trim();
		const productId = String(entry.product_id ?? "").trim();
		const group = String(entry.group_name ?? "").trim();
		const name = String(entry.name ?? "").trim();
		if (!id || !productId || !group || !name) continue;
		const delta = Number(entry.price_delta);
		const image = typeof entry.image_url === "string" && entry.image_url.trim() ? entry.image_url.trim() : null;
		const list = byProduct.get(productId) ?? [];
		list.push({
			id,
			name,
			priceDelta: Number.isFinite(delta) ? delta : 0,
			imageUrl: image ? resolveImage(image) : null,
			group,
			sort: Number(entry.sort_order) || 0,
		});
		byProduct.set(productId, list);
	}
	const result = new Map<string, ProductVariantGroup[]>();
	for (const [productId, list] of byProduct) {
		list.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
		const groups: ProductVariantGroup[] = [];
		for (const option of list) {
			let group = groups.find((entry) => entry.name.toLowerCase() === option.group.toLowerCase());
			if (!group) {
				group = { name: option.group, options: [] };
				groups.push(group);
			}
			group.options.push({ id: option.id, name: option.name, priceDelta: option.priceDelta, imageUrl: option.imageUrl });
		}
		result.set(productId, groups);
	}
	return result;
}

/** Todas las opciones de todos los grupos, por id. */
function indexVariantOptions(groups: ProductVariantGroup[] | null | undefined): Map<string, ProductVariantOption & { group: string }> {
	const index = new Map<string, ProductVariantOption & { group: string }>();
	for (const group of groups ?? []) {
		for (const option of group.options) index.set(option.id, { ...option, group: group.name });
	}
	return index;
}

/** Opción predeterminada de cada grupo: la primera. */
export function defaultVariantSelection(groups: ProductVariantGroup[] | null | undefined): string[] {
	return (groups ?? []).map((group) => group.options[0]?.id).filter((id): id is string => Boolean(id));
}

/**
 * Resuelve una selección contra los grupos vigentes. Devuelve null si falta alguna
 * opción (variante borrada o de otro producto): la línea ya no describe lo que pidió
 * la persona y hay que quitarla, igual que con un tamaño borrado.
 */
export function resolveVariantSelection(
	groups: ProductVariantGroup[] | null | undefined,
	variantIds: string[] | null | undefined,
): { ids: string[]; names: string[]; delta: number } | null {
	const index = indexVariantOptions(groups);
	const ids: string[] = [];
	const names: string[] = [];
	const seenGroups = new Set<string>();
	let delta = 0;
	for (const rawId of variantIds ?? []) {
		const option = index.get(String(rawId));
		if (!option || seenGroups.has(option.group)) return null;
		seenGroups.add(option.group);
		ids.push(option.id);
		names.push(option.name);
		delta += option.priceDelta;
	}
	return { ids, names, delta };
}

/** ¿Hay que elegir algo (tamaño o variante) antes de agregar este producto? */
export function productNeedsConfiguration(product: {
	sizes?: { id: string }[] | null;
	variants?: ProductVariantGroup[] | null;
}): boolean {
	return Boolean(product.sizes?.length) || Boolean(product.variants?.some((group) => group.options.length > 0));
}
