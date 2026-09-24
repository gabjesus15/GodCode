import { sanitizeUserText } from "@/utils/sanitize-user-text";
import type { DeliveryLocationSource } from "@/lib/delivery/delivery-location";
import type { OrderCatalogLine } from "../../data/orders/build-order-items-from-branch";
import {
	isUpsellBeverageLineId,
	type CartFulfillment,
	type CartGlobalExtraSelection,
} from "../cart-context";
import type { CartLineItem } from "../cart-modal-types";
import { parseManualKm } from "../utils/fulfillment-validation";
import { joinAddressLine } from "../utils/street-number";
import type { SubmitOrderParams } from "./order-submission";

type LineSelection = { id: string; name: string; price: number; qty: number };

function normalizeSelections(
	list: Array<{ id: string; name: string; price: number; qty: number }> | undefined,
): LineSelection[] {
	return (list ?? [])
		.map((entry) => ({
			id: String(entry.id),
			name: String(entry.name),
			price: Math.max(0, Number(entry.price) || 0),
			qty: Math.max(1, Number(entry.qty) || 1),
		}))
		.filter((entry) => entry.id);
}

function describeSelections(list: LineSelection[]): string {
	return list.map((entry) => `${entry.qty}x ${entry.name}`).join(", ");
}

/**
 * Prefijos con los que el panel del local lee la descripción de cada línea.
 * Son parte del contrato con el POS, no copy de la interfaz del cliente.
 */
export const ORDER_LINE_LABELS = {
	extras: "Extras",
	beverages: "Bebidas",
	note: "Nota",
} as const;

/** Líneas de catálogo (platos + sus extras/bebidas) tal como las valida la RPC. */
export function buildCatalogOrderLines(cart: CartLineItem[]): OrderCatalogLine[] {
	return cart.map((item) => {
		const isUpsellBeverage = isUpsellBeverageLineId(item.id);
		const selectedExtras = normalizeSelections(item.selected_extras);
		const selectedBeverages = isUpsellBeverage
			? []
			: normalizeSelections(item.selected_beverages);
		const extrasTotal = [...selectedExtras, ...selectedBeverages].reduce(
			(sum, entry) => sum + entry.price * entry.qty,
			0,
		);
		const extrasDescription = [
			selectedExtras.length
				? `${ORDER_LINE_LABELS.extras}: ${describeSelections(selectedExtras)}`
				: "",
			selectedBeverages.length
				? `${ORDER_LINE_LABELS.beverages}: ${describeSelections(selectedBeverages)}`
				: "",
		]
			.filter(Boolean)
			.join(" | ");
		const note = item.line_note?.trim();
		const notePart = note ? `${ORDER_LINE_LABELS.note}: ${sanitizeUserText(note)}` : "";
		const fullDescription = [
			item.description ?? "",
			item.line_summary ?? "",
			extrasDescription,
			notePart,
		]
			.filter(Boolean)
			.join(" | ");

		return {
			id: item.id,
			name: String(item.name ?? ""),
			quantity: Number(item.quantity) || 1,
			price: Number(item.price) || 0,
			has_discount: Boolean(item.has_discount),
			discount_price:
				item.has_discount && item.discount_price != null ? Number(item.discount_price) : null,
			description: fullDescription ? sanitizeUserText(fullDescription) : null,
			extras_total: Math.round(extrasTotal),
			extras: [...selectedExtras, ...selectedBeverages],
			custom_item: isUpsellBeverage,
		};
	});
}

/** Extras globales del pedido como líneas propias (el POS las cobra aparte). */
export function buildGlobalExtraOrderLines(
	globalExtras: CartGlobalExtraSelection[],
	copy: { fallbackName: string; description: string },
): OrderCatalogLine[] {
	return globalExtras.map((extra, index) => ({
		id: `global_extra_${index}_${extra.id}`,
		name: String(extra.name ?? copy.fallbackName),
		quantity: Math.max(1, Number(extra.qty) || 1),
		price: Math.max(0, Number(extra.price) || 0),
		has_discount: false,
		discount_price: null,
		description: copy.description,
		extras_total: 0,
		extras: [],
		custom_item: true,
	}));
}

/** Notas por línea en un solo bloque ("Plato: nota"), para el campo `note` del pedido. */
export function buildLineNotesBlock(cart: CartLineItem[]): string {
	return cart
		.filter((line) => line.line_note?.trim())
		.map((line) => `${line.name}: ${sanitizeUserText(line.line_note!.trim())}`)
		.join("\n");
}

export type DeliverySnapshot = {
	address: string;
	formatted_address: string;
	line1: string;
	commune: string;
	reference?: string;
	lat: number | null;
	lng: number | null;
	delivery_km?: number;
	named_area_id?: string;
	named_area_label?: string;
};

export type DeliverySnapshotInput = {
	isDelivery: boolean;
	pricingMode: "named" | "distance" | "external";
	line1: string;
	area: string;
	reference: string;
	lat: number | null;
	lng: number | null;
	/** Cómo se obtuvo el punto; el servidor lo guarda y decide el enlace de mapa. */
	locationSource?: DeliveryLocationSource | null;
	namedAreaId: string | null;
	namedAreaLabel: string | null;
	quotedRouteKm: number | null;
	kmManual: string;
};

/**
 * Km que viajan con el pedido. Solo en modo distancia: la cotización del
 * servidor si existe, o los km a mano como respaldo cuando no hubo mapa.
 */
export function resolveDeliveryKmForOrder(input: DeliverySnapshotInput): number {
	if (!input.isDelivery || input.pricingMode !== "distance") return 0;
	if (input.quotedRouteKm != null && Number(input.quotedRouteKm) > 0) {
		return Math.round(Number(input.quotedRouteKm));
	}
	const manual = parseManualKm(input.kmManual);
	return Number.isFinite(manual) ? Math.round(manual) : 0;
}

export function buildDeliverySnapshot(input: DeliverySnapshotInput): DeliverySnapshot | null {
	if (!input.isDelivery) return null;
	const fullAddress = joinAddressLine(input.line1, input.area);
	const km = resolveDeliveryKmForOrder(input);
	const reference = input.reference.trim();
	const namedAreaId = input.namedAreaId?.trim();
	return {
		address: sanitizeUserText(fullAddress),
		formatted_address: sanitizeUserText(fullAddress),
		line1: sanitizeUserText(input.line1),
		commune: sanitizeUserText(input.area),
		...(reference ? { reference: sanitizeUserText(reference) } : {}),
		lat: input.lat,
		lng: input.lng,
		// Respaldo de km para el servidor cuando no hay lat/lng (checkout sin mapa):
		// `resolve_delivery_fee_for_role_legacy_v1` prioriza haversine con coords y,
		// si no hay, lee este `delivery_km` para resolver la zona por radio.
		...(km > 0 ? { delivery_km: km } : {}),
		...(namedAreaId ? { named_area_id: namedAreaId } : {}),
		...(input.namedAreaLabel ? { named_area_label: input.namedAreaLabel } : {}),
	};
}

export type BuildOrderPayloadInput = {
	clientRequestId: string;
	client: { name: string; phone: string; rut: string };
	paymentMethodKey: string | null;
	requiresReceipt: boolean;
	cart: CartLineItem[];
	globalExtras: CartGlobalExtraSelection[];
	globalExtraCopy: { fallbackName: string; description: string };
	fulfillment: CartFulfillment;
	deliveryEnabled: boolean;
	delivery: DeliverySnapshotInput;
	totals: { grandTotal: number; deliveryFee: number };
	branch: {
		id: string;
		name: string | null;
		company_id?: string | null;
		currency?: string | null;
	};
	branchNameFallback: string;
	currency: string;
	uberQuoteId: string | null;
	couponCode: string | null;
	/** Con sesión en "Mi cuenta" el pedido lo crea el servidor con la cuenta de la sesión. */
	accountOrder?: boolean;
};

export function buildOrderPayload(input: BuildOrderPayloadInput): SubmitOrderParams {
	const isDelivery = input.fulfillment === "delivery" && input.deliveryEnabled;
	const delivery = { ...input.delivery, isDelivery };
	const snapshot = buildDeliverySnapshot(delivery);
	const couponCode = input.couponCode?.trim() || null;

	return {
		client_request_id: input.clientRequestId,
		client_name: sanitizeUserText(input.client.name),
		client_phone: String(input.client.phone ?? "").trim(),
		client_rut: String(input.client.rut ?? "").trim(),
		payment_method_specific: input.paymentMethodKey,
		total: Number(input.totals.grandTotal) || 0,
		items: [
			...buildCatalogOrderLines(input.cart),
			...buildGlobalExtraOrderLines(input.globalExtras, input.globalExtraCopy),
		],
		note: buildLineNotesBlock(input.cart),
		status: "pending",
		branch_id: input.branch.id,
		branch_name: input.branch.name || input.branchNameFallback,
		company_id: input.branch.company_id || null,
		currency: input.branch.currency || input.currency || null,
		requires_receipt: input.requiresReceipt,
		order_type: isDelivery ? "delivery" : "pickup",
		delivery_address: snapshot,
		delivery_fee: isDelivery ? input.totals.deliveryFee : 0,
		delivery_km: resolveDeliveryKmForOrder(delivery),
		delivery_lat: input.delivery.lat,
		delivery_lng: input.delivery.lng,
		delivery_location_source: isDelivery ? (input.delivery.locationSource ?? null) : null,
		delivery_named_area_id: input.delivery.namedAreaId?.trim() || null,
		uber_quote_id: input.uberQuoteId || null,
		coupon_code: couponCode,
		account_order: input.accountOrder === true,
	};
}
