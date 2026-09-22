import type { CartLineItem } from "../cart-modal-types";
import { ORDER_LINE_LABELS } from "./build-order-payload";
import {
	generateWSMessage,
	type WsFulfillmentMeta,
	type WsMessageCopy,
} from "./whatsapp-message";

export type WsTranslate = (key: string) => string;

/** Copy del mensaje de WhatsApp desde el diccionario `tenant.cart.modal`. */
export function resolveWhatsAppCopy(t: WsTranslate, idName: string): Partial<WsMessageCopy> {
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
	};
}

export type WhatsAppHandoffInput = {
	client: { name: string; rut: string; phone: string };
	cart: CartLineItem[];
	paymentMethodKey: string | null;
	paymentMethodLabel: string;
	/** Configuración del método elegido (`activeInfo[paymentMethodKey]`), si existe. */
	paymentData: unknown;
	businessName: string | null | undefined;
	meta: WsFulfillmentMeta;
	copy: Partial<WsMessageCopy>;
};

/** Mensaje listo para `wa.me` (sin codificar): la nota de cada línea va pegada a su descripción. */
export function buildWhatsAppHandoffMessage(input: WhatsAppHandoffInput): string {
	const cartForMessage = input.cart.map((line) => {
		const note = line.line_note?.trim();
		const notePart = note ? `${ORDER_LINE_LABELS.note}: ${note}` : "";
		const description = [line.description, notePart].filter(Boolean).join(" | ");
		return { ...line, description: description || line.description };
	});
	const lineNotes = input.cart
		.filter((line) => line.line_note?.trim())
		.map((line) => `${line.name}: ${line.line_note!.trim()}`)
		.join("\n");

	return generateWSMessage(
		input.client,
		cartForMessage,
		input.meta.grandTotal,
		input.paymentMethodKey,
		lineNotes,
		input.businessName,
		input.paymentData,
		input.meta,
		input.copy,
		input.paymentMethodLabel,
	);
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
