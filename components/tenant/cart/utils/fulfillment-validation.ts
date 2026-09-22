import type { NamedAreaResolution } from "@/lib/delivery/delivery-settings";
import type { CartFulfillment } from "../cart-context";

export const MIN_DRIVER_REFERENCE_LEN = 6;

export type DeliveryPricingMode = "named" | "distance" | "external";

export type FulfillmentInput = {
	fulfillment: CartFulfillment;
	deliveryEnabled: boolean;
	pricingMode: DeliveryPricingMode;
	namedAreaResolution: NamedAreaResolution;
	minOrderSubtotal: number | null | undefined;
	cartSubtotal: number;
	line1: string;
	area: string;
	reference: string;
	lat: number | null | undefined;
	lng: number | null | undefined;
	namedAreaId: string | null | undefined;
	namedAreaLabel: string | null | undefined;
	kmManual: string;
	quoteLoading: boolean;
	quoteError: string | null | undefined;
	outOfZone: boolean;
};

/** Por qué el cliente todavía no puede pasar a métodos de pago. */
export type FulfillmentBlocker =
	| { code: "need_location"; external: boolean }
	| { code: "need_driver_instructions"; min: number }
	| { code: "out_of_zone" }
	| { code: "below_min_order"; minOrder: number }
	| { code: "quote_loading" }
	| { code: "quote_error"; message: string }
	| { code: "incomplete" };

export type FulfillmentEvaluation = {
	canProceed: boolean;
	blocker: FulfillmentBlocker | null;
	/** Modo distancia o externo: la dirección se resuelve con mapa. */
	mapAddressMode: boolean;
	requiresAddress: boolean;
	hasCoords: boolean;
	addressOk: boolean;
	referenceOk: boolean;
	meetsMinOrder: boolean;
};

export function hasValidCoords(lat: unknown, lng: unknown): boolean {
	return (
		typeof lat === "number" &&
		typeof lng === "number" &&
		Number.isFinite(lat) &&
		Number.isFinite(lng)
	);
}

/** Km escritos a mano ("2,5" o "2.5"); NaN cuando no son un número válido. */
export function parseManualKm(value: string): number {
	const n = Number(String(value ?? "").replace(",", "."));
	return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

/**
 * Única fuente de verdad del paso "cómo recibes tu pedido". Antes vivía como
 * dos ternarios anidados en el modal que ya habían divergido entre sí.
 */
export function evaluateFulfillment(input: FulfillmentInput): FulfillmentEvaluation {
	const mapAddressMode = input.pricingMode === "distance" || input.pricingMode === "external";
	const hasCoords = hasValidCoords(input.lat, input.lng);
	const minOrder = input.minOrderSubtotal ?? 0;

	if (input.fulfillment !== "delivery" || !input.deliveryEnabled) {
		return {
			canProceed: true,
			blocker: null,
			mapAddressMode,
			requiresAddress: false,
			hasCoords,
			addressOk: true,
			referenceOk: true,
			meetsMinOrder: true,
		};
	}

	const meetsMinOrder = input.cartSubtotal + 1e-9 >= minOrder;
	const addressOk =
		input.line1.trim().length >= 4 && (input.area.trim().length >= 2 || hasCoords);
	const referenceOk = input.reference.trim().length >= MIN_DRIVER_REFERENCE_LEN;
	const isNamed = input.pricingMode === "named";
	const namedManualOk =
		!isNamed ||
		input.namedAreaResolution !== "manual_select" ||
		Boolean(input.namedAreaId?.trim());
	const addressMatchedOk =
		!isNamed ||
		input.namedAreaResolution !== "address_matched" ||
		(addressOk && !input.quoteLoading && !input.quoteError && input.namedAreaLabel != null);
	const quoteHealthy = !input.outOfZone && !input.quoteError;
	const distanceReady = !mapAddressMode
		? true
		: input.pricingMode === "external"
			? quoteHealthy && hasCoords && !input.quoteLoading
			: quoteHealthy &&
				(hasCoords ? !input.quoteLoading : Number.isFinite(parseManualKm(input.kmManual)));
	const requiresAddress =
		mapAddressMode || (isNamed && input.namedAreaResolution === "address_matched");

	const canProceed =
		(requiresAddress ? addressOk : true) &&
		meetsMinOrder &&
		referenceOk &&
		namedManualOk &&
		addressMatchedOk &&
		distanceReady;

	let blocker: FulfillmentBlocker | null = null;
	if (!canProceed) {
		const external = input.pricingMode === "external";
		if (requiresAddress && !addressOk) {
			blocker = { code: "need_location", external };
		} else if (mapAddressMode && !hasCoords) {
			blocker = { code: "need_location", external };
		} else if (!referenceOk) {
			blocker = { code: "need_driver_instructions", min: MIN_DRIVER_REFERENCE_LEN };
		} else if (input.outOfZone) {
			blocker = { code: "out_of_zone" };
		} else if (!meetsMinOrder) {
			blocker = { code: "below_min_order", minOrder };
		} else if (input.quoteLoading && mapAddressMode && hasCoords) {
			blocker = { code: "quote_loading" };
		} else if (input.quoteError) {
			blocker = { code: "quote_error", message: input.quoteError };
		} else {
			blocker = { code: "incomplete" };
		}
	}

	return {
		canProceed,
		blocker,
		mapAddressMode,
		requiresAddress,
		hasCoords,
		addressOk,
		referenceOk,
		meetsMinOrder,
	};
}
