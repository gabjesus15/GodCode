/**
 * Contrato JSON compartido para POST /api/geo/delivery-quote (storefront + validación checkout).
 */

export const UBER_NEEDS_COORDINATES_CODE = "uber_needs_coordinates" as const;

export type DeliveryQuoteProvider = "uber_direct";

export type DeliveryQuoteSuccess = {
	ok: true;
	provider?: DeliveryQuoteProvider;
	showDeliveryFeeAmount?: boolean;
	fee?: number;
	currencyCode?: string;
	deliveryDisplayText?: string;
	uberQuoteId?: string | null;
	/** Modos internos legados */
	mode?: "distance" | "named_area";
	distanceKm?: number;
	namedAreaResolution?: string;
	namedAreaId?: string;
	label?: string;
	waivedFreeShipping?: boolean;
};

export type DeliveryQuoteErrorBody = {
	ok?: false;
	error: string;
	code?: string;
};

export function isUberNeedsCoordinatesError(
	body: DeliveryQuoteErrorBody | Record<string, unknown>,
): boolean {
	return String(body.code ?? "") === UBER_NEEDS_COORDINATES_CODE;
}
