import type { OrderCatalogLine } from "@/components/tenant/data/orders/build-order-items-from-branch";

/**
 * Combina las líneas de catálogo con los extras globales / bebidas upsell.
 *
 * `validate_and_normalize_order_items` valida cada extra/bebida contra el catálogo JSON de la
 * sucursal (por id crudo, marcado con `is_extra` / `manual_order_source`), así que van como
 * LÍNEAS PROPIAS del pedido — no plegadas en el `extras_total` de la primera pizza. Así aparecen
 * como su propio ítem con su precio en el POS y la cocina.
 */
export function mergeCustomLinesForRpc(
	catalogItems: OrderCatalogLine[],
	customItems: OrderCatalogLine[],
): OrderCatalogLine[] {
	if (customItems.length === 0) return catalogItems;
	if (catalogItems.length === 0) {
		throw new Error(
			"Agrega al menos un producto del menu para confirmar el pedido con extras o bebidas adicionales.",
		);
	}

	return [...catalogItems, ...customItems];
}
