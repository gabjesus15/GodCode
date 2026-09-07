import {
	normalizeExtrasPayload,
	type OrderCatalogLine,
} from "@/components/tenant/data/orders/build-order-items-from-branch";

/**
 * El RPC `create_order_transaction` solo suma precios de productos de catálogo (UUID en sucursal).
 * Los extras globales / bebidas upsell van como `extras_total` en la primera línea de catálogo.
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

	// Redondeo a 2 decimales (no a entero): en monedas con céntimos (USD/VES) un extra de
	// $0.50 no debe cobrarse como $1. El server confía en `extras_total`, así que basta con
	// mandar el valor exacto.
	const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;
	const items = catalogItems.map((line, index) => (index === 0 ? { ...line } : { ...line }));
	const host = items[0]!;
	const customExtras = customItems.flatMap((line) => {
		const qty = Math.max(1, Number(line.quantity) || 1);
		const unit = Math.max(0, round2(Number(line.price) || 0));
		return Array.from({ length: qty }, () => ({
			id: String(line.id ?? "custom"),
			name: String(line.name ?? "Extra"),
			price: unit,
			qty: 1,
		}));
	});

	const extraTotal = customExtras.reduce((sum, ex) => sum + ex.price * ex.qty, 0);
	host.extras_total = Math.max(0, round2((Number(host.extras_total) || 0) + extraTotal));
	host.extras = [...normalizeExtrasPayload(host.extras), ...customExtras];

	return items;
}
