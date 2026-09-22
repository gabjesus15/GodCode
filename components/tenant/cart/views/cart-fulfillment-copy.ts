import { DELIVERY_QUOTE_INVALID_NAMED_AREA } from "../utils/delivery-quote-state";
import { formatCartMoney } from "../utils/format-cart-money";
import type { FulfillmentBlocker } from "../utils/fulfillment-validation";

export type CartTranslate = (key: string, values?: Record<string, string | number>) => string;

/** Texto del bloqueo del paso de entrega, a partir de su código. */
export function fulfillmentBlockerMessage(
	blocker: FulfillmentBlocker | null,
	t: CartTranslate,
	currency: string,
): string | null {
	if (!blocker) return null;
	switch (blocker.code) {
		case "need_location":
			return blocker.external
				? t("delivery.needLocationForUber")
				: t("delivery.needLocationStreetOrKm");
		case "need_driver_instructions":
			return t("delivery.addDriverInstructionsMin", { min: blocker.min });
		case "out_of_zone":
			return t("delivery.locationOutsideArea");
		case "below_min_order":
			return t("delivery.minOrderForDelivery", {
				amount: formatCartMoney(blocker.minOrder, currency),
			});
		case "quote_loading":
			return t("delivery.calculatingWithLocation");
		case "quote_error":
			return deliveryQuoteErrorMessage(blocker.message, t);
		default:
			return t("delivery.completeDataToContinue");
	}
}

/** Los errores del servidor ya vienen como texto; los locales son códigos traducibles. */
export function deliveryQuoteErrorMessage(error: string | null, t: CartTranslate): string | null {
	if (!error) return null;
	return error === DELIVERY_QUOTE_INVALID_NAMED_AREA ? t("delivery.invalidNamedArea") : error;
}
