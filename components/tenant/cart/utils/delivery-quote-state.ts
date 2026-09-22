import {
	computeDeliveryFee,
	type DeliverySettingsNormalized,
} from "@/lib/delivery/delivery-settings";
import type { DeliveryQuoteResult } from "../hooks/use-delivery-quote";
import type { DeliveryPricingMode } from "./fulfillment-validation";

/** El cliente eligió una zona que ya no existe en la configuración del local. */
export const DELIVERY_QUOTE_INVALID_NAMED_AREA = "invalid_named_area";

export type DeliveryQuoteState = {
	deliveryFee: number;
	waivedFree: boolean;
	namedLabel: string | null;
	quotedRouteKm: number | null;
	outOfZone: boolean;
	quoteLoading: boolean;
	quoteError: string | null;
	uberQuoteId: string | null;
};

const IDLE_QUOTE: DeliveryQuoteState = {
	deliveryFee: 0,
	waivedFree: false,
	namedLabel: null,
	quotedRouteKm: null,
	outOfZone: false,
	quoteLoading: false,
	quoteError: null,
	uberQuoteId: null,
};

export type DeliveryQuoteInput = {
	isDelivery: boolean;
	settings: DeliverySettingsNormalized;
	pricingMode: DeliveryPricingMode;
	cartSubtotal: number;
	namedAreaId: string | null;
	/** Respuesta del servidor (React Query), si ya llegó. */
	quote: DeliveryQuoteResult | undefined;
	quoteFetching: boolean;
	quoteFetchError: string | null;
	/** Km en línea recta cliente–local, cuando hay coordenadas. */
	haversineKm: number | null;
	/** Km escritos a mano; NaN si no son válidos. */
	manualKm: number;
};

function findNamedAreaName(settings: DeliverySettingsNormalized, id: string | null): string | null {
	if (!id) return null;
	return settings.namedAreas.find((area) => area.id === id)?.name ?? null;
}

/**
 * Qué cobra el envío ahora mismo: la cotización del servidor manda; mientras
 * llega, o si no aplica, se calcula localmente con las mismas reglas del local.
 */
export function resolveDeliveryQuoteState(input: DeliveryQuoteInput): DeliveryQuoteState {
	const { settings, pricingMode, cartSubtotal } = input;
	if (!input.isDelivery || !settings.enabled) return IDLE_QUOTE;

	const meetsMinOrder =
		settings.minOrderSubtotal == null || cartSubtotal + 1e-9 >= settings.minOrderSubtotal;
	if (!meetsMinOrder) return IDLE_QUOTE;

	if (input.quote) {
		return {
			deliveryFee: input.quote.fee,
			waivedFree: input.quote.waivedFree,
			namedLabel: input.quote.namedLabel ?? null,
			quotedRouteKm: input.quote.quotedRouteKm ?? null,
			outOfZone: input.quote.outOfZone,
			quoteLoading: input.quoteFetching,
			quoteError: input.quote.error ?? null,
			uberQuoteId: input.quote.uberQuoteId ?? null,
		};
	}

	if (input.quoteFetching) {
		return {
			...IDLE_QUOTE,
			namedLabel: pricingMode === "named" ? findNamedAreaName(settings, input.namedAreaId) : null,
			quoteLoading: true,
		};
	}

	if (pricingMode === "distance") {
		const kmRaw = input.haversineKm ?? (Number.isFinite(input.manualKm) ? input.manualKm : 0);
		const kmBilled = Math.max(0, Math.round(kmRaw));
		if (settings.maxDeliveryKm != null && kmRaw > settings.maxDeliveryKm + 1e-9) {
			return { ...IDLE_QUOTE, quotedRouteKm: kmBilled, outOfZone: true };
		}
		const result = computeDeliveryFee(settings, kmBilled, cartSubtotal);
		return {
			...IDLE_QUOTE,
			deliveryFee: Math.round(result.fee < 0 ? 0 : result.fee),
			waivedFree: result.waivedFreeShipping,
			quotedRouteKm: kmBilled,
			outOfZone: result.fee === -1,
		};
	}

	if (pricingMode === "named" && settings.namedAreaResolution === "manual_select") {
		const id = input.namedAreaId?.trim() || null;
		const result = computeDeliveryFee(settings, 0, cartSubtotal, { namedAreaId: id });
		return {
			...IDLE_QUOTE,
			deliveryFee: Math.round(result.fee < 0 ? 0 : result.fee),
			waivedFree: result.waivedFreeShipping,
			namedLabel: findNamedAreaName(settings, id),
			quoteError: result.fee === -4 ? DELIVERY_QUOTE_INVALID_NAMED_AREA : null,
		};
	}

	return { ...IDLE_QUOTE, quoteError: input.quoteFetchError };
}
