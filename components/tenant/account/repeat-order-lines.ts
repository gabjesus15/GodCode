import { isUpsellBeverageLineId, type CartItem } from "../cart/cart-context";

import type { MenuAccountOrder, MenuAccountOrderItem } from "./menu-account-types";

/** Mismo tope por línea que `addToCart`. */
const MAX_LINE_QUANTITY = 20;

const UPSELL_BEVERAGE_PREFIX = "upsell_beverage_";

/** Líneas del pedido que se pueden volver a poner en el carrito. */
export function repeatableItems(order: MenuAccountOrder): MenuAccountOrderItem[] {
	return order.items.filter((item) => item.productId);
}

function lineQuantity(item: MenuAccountOrderItem): number {
	return Math.min(Math.max(1, Math.round(item.quantity)), MAX_LINE_QUANTITY);
}

/**
 * Bebida sugerida: se rearma igual que la agrega el carrito (`upsell_beverage_<id>` y la
 * bebida en `selected_beverages`). Con su id crudo el checkout no la reconocía ni como
 * producto ni como bebida y la dejaba fuera del pedido sin avisar, aunque WhatsApp sí la
 * mostrara.
 */
function beverageLine(item: MenuAccountOrderItem, stamp: string): CartItem {
	const rawId = String(item.productId);
	const id = isUpsellBeverageLineId(rawId) ? rawId : `${UPSELL_BEVERAGE_PREFIX}${rawId}`;
	const beverageId = id.slice(UPSELL_BEVERAGE_PREFIX.length);
	return {
		lineId: `${id}:repeat:${stamp}`,
		id,
		name: item.name,
		price: item.unitPrice,
		has_discount: false,
		discount_price: null,
		quantity: lineQuantity(item),
		selected_extras: [],
		selected_beverages: [{ id: beverageId, name: item.name, price: item.unitPrice, qty: 1 }],
		line_summary: null,
		line_note: item.note,
	};
}

/**
 * Carrito de "Repetir pedido". Los precios son los del pedido original a propósito: al
 * llegar al menú, el provider del carrito los reemplaza por los vigentes de la sucursal y
 * quita los productos que ya no se venden.
 */
export function buildRepeatCartLines(order: MenuAccountOrder, now: number = Date.now()): CartItem[] {
	const base = now.toString(36);
	return repeatableItems(order).map((item, index) => {
		const stamp = `${base}${index}`;
		if (item.beverage) return beverageLine(item, stamp);
		return {
			lineId: `${item.productId}:repeat:${stamp}`,
			id: item.productId as string,
			name: item.name,
			price: item.unitPrice,
			has_discount: false,
			discount_price: null,
			// El provider refresca el precio del tamaño y quita la línea si el tamaño ya no existe.
			...(item.sizeId ? { size_id: item.sizeId, size_name: item.sizeName ?? null } : {}),
			...(item.variantIds && item.variantIds.length > 0
				? { variant_ids: item.variantIds, variant_names: item.variantNames ?? [] }
				: {}),
			quantity: lineQuantity(item),
			selected_extras: item.extras
				.filter((extra) => extra.id)
				.map((extra) => ({
					id: extra.id as string,
					name: extra.name,
					price: extra.price,
					qty: extra.quantity,
				})),
			selected_beverages: [],
			line_summary: null,
			line_note: item.note,
		};
	});
}
