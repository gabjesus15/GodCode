import { isUpsellBeverageLineId, type CartGlobalExtraSelection } from "../cart-context";
import type { CartLineItem } from "../cart-modal-types";
import {
	generateWSMessage,
	type WsCartLine,
	type WsFulfillmentMeta,
	type WsMessageCopy,
} from "./whatsapp-message";

export type WsTranslate = (key: string) => string;

/** Copy del mensaje de WhatsApp desde el diccionario `tenant.cart.modal`. */
export function resolveWhatsAppCopy(t: WsTranslate, idName: string): Partial<WsMessageCopy & WsLineCopy> {
	return {
		titlePrefix: t("ws.titlePrefix"),
		businessFallback: t("ws.businessFallback"),
		customer: t("ws.customer"),
		rut: idName,
		phone: t("ws.phone"),
		typeLabel: t("ws.typeLabel"),
		typeDelivery: t("ws.typeDelivery"),
		typePickup: t("ws.typePickup"),
		shipping: t("ws.shipping"),
		subtotalProducts: t("ws.subtotalProducts"),
		orderNumber: t("ws.orderNumber"),
		orderId: t("ws.orderId"),
		handoffCode: t("ws.handoffCode"),
		detail: t("ws.detail"),
		doLabel: t("ws.doLabel"),
		total: t("ws.total"),
		couponLabel: t("ws.couponLabel"),
		taxLabel: t("ws.taxLabel"),
		payment: t("ws.payment"),
		paymentUnknown: t("paymentMethods.unknown"),
		bankTransferTitle: t("ws.bankTransferTitle"),
		bank: t("ws.bank"),
		accountType: t("ws.accountType"),
		account: t("ws.account"),
		holder: t("ws.holder"),
		bankTransferHint: t("ws.bankTransferHint"),
		note: t("ws.note"),
		taxIncluded: t("ws.taxIncluded"),
		taxAdded: t("ws.taxAdded"),
		addressReference: t("ws.addressReference"),
		mapLink: t("ws.mapLink"),
		branch: t("ws.branch"),
		webReference: t("ws.webReference"),
		extras: t("ws.extras"),
		beverages: t("ws.beverages"),
		changes: t("ws.changes"),
		generalExtra: t("ws.generalExtra"),
	};
}

/** Rótulos de las viñetas de cada plato (no son parte del mensaje base). */
export type WsLineCopy = {
	extras: string;
	beverages: string;
	changes: string;
	note: string;
	generalExtra: string;
};

const DEFAULT_LINE_COPY: WsLineCopy = {
	extras: "Extras",
	beverages: "Bebidas",
	changes: "Cambios",
	note: "Nota",
	generalExtra: "Extra del pedido",
};

export type WhatsAppHandoffInput = {
	client: { name: string; rut: string; phone: string };
	cart: CartLineItem[];
	/** Extras que se agregan al pedido completo (no a un plato). */
	globalExtras?: CartGlobalExtraSelection[];
	paymentMethodKey: string | null;
	paymentMethodLabel: string;
	/** Configuración del método elegido (`activeInfo[paymentMethodKey]`), si existe. */
	paymentData: unknown;
	businessName: string | null | undefined;
	meta: WsFulfillmentMeta;
	copy: Partial<WsMessageCopy & WsLineCopy>;
};

type Selection = { name: string; price: number; qty: number };

function money(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? n : 0;
}

function qty(value: unknown): number {
	const n = Number(value);
	return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function describe(list: Selection[] | undefined): string {
	return (list ?? [])
		.filter((entry) => String(entry?.name ?? "").trim())
		.map((entry) => `${qty(entry.qty)}x ${String(entry.name).trim()}`)
		.join(", ");
}

function selectionsTotal(list: Selection[] | undefined): number {
	return (list ?? []).reduce((sum, entry) => sum + money(entry.price) * qty(entry.qty), 0);
}

/** Precio unitario del plato: con descuento si lo tiene (igual que el carrito). */
function baseUnitPrice(line: CartLineItem): number {
	const discount = money(line.discount_price);
	if (line.has_discount && discount > 0) return discount;
	return money(line.price);
}

/**
 * Una línea del carrito como se lee en WhatsApp: total con sus extras y, debajo, extras,
 * bebidas, cambios elegidos y la nota del cliente. La descripción del catálogo no va: es
 * texto de venta, no una instrucción para la cocina.
 */
export function toWhatsAppLine(line: CartLineItem, copy: WsLineCopy = DEFAULT_LINE_COPY): WsCartLine {
	const isUpsellBeverage = isUpsellBeverageLineId(line.id);
	const beverages = isUpsellBeverage ? [] : line.selected_beverages;
	const unit = baseUnitPrice(line) + selectionsTotal(line.selected_extras) + selectionsTotal(beverages);
	const quantity = qty(line.quantity);
	const details: string[] = [];
	const extrasText = describe(line.selected_extras);
	if (extrasText) details.push(`${copy.extras}: ${extrasText}`);
	const beveragesText = describe(beverages);
	if (beveragesText) details.push(`${copy.beverages}: ${beveragesText}`);
	const summary = line.line_summary?.trim();
	if (summary) details.push(`${copy.changes}: ${summary}`);
	const note = line.line_note?.trim();
	if (note) details.push(`${copy.note}: ${note}`);
	return { name: line.name, quantity, lineTotal: unit * quantity, details };
}

/** Mensaje listo para `wa.me` (sin codificar). */
export function buildWhatsAppHandoffMessage(input: WhatsAppHandoffInput): string {
	const lineCopy: WsLineCopy = { ...DEFAULT_LINE_COPY };
	for (const key of Object.keys(DEFAULT_LINE_COPY) as Array<keyof WsLineCopy>) {
		const value = input.copy[key];
		if (typeof value === "string" && value.trim()) lineCopy[key] = value;
	}
	const lines: WsCartLine[] = input.cart.map((line) => toWhatsAppLine(line, lineCopy));
	for (const extra of input.globalExtras ?? []) {
		const quantity = qty(extra.qty);
		lines.push({
			name: extra.name,
			quantity,
			lineTotal: money(extra.price) * quantity,
			details: [lineCopy.generalExtra],
		});
	}

	return generateWSMessage(
		input.client,
		lines,
		input.meta.grandTotal,
		input.paymentMethodKey,
		"",
		input.businessName,
		input.paymentData,
		input.meta,
		input.copy,
		input.paymentMethodLabel,
	);
}

/**
 * Código corto para nombrar un pedido que no se guardó en el panel (solo WhatsApp).
 * Sale del id de la petición, así que es el mismo si el cliente reintenta.
 */
export function buildWebOrderReference(requestId: string | null | undefined): string | null {
	const compact = String(requestId ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
	return compact.length >= 6 ? compact.slice(0, 6) : null;
}

/** URL de WhatsApp para el número del local; `null` si no hay número configurado. */
export function buildWhatsAppUrl(
	phone: string | null | undefined,
	message: string,
): string | null {
	const digits = String(phone ?? "").replace(/\D/g, "");
	if (!digits) return null;
	return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
