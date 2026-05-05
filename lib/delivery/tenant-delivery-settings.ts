/**
 * Re-export del contrato de delivery alineado con el panel admin.
 * @deprecated Preferir importar desde `lib/delivery-settings`.
 */
export {
	normalizeDeliverySettings,
	normalizeDeliverySettings as parseDeliverySettings,
	computeDeliveryFee,
	effectiveDeliveryPricingMode,
	orderItemsSubtotalFromPayload,
	stripStaffOnlyDeliverySettings,
	resolveDeliveryPaymentMethodsForCheckout,
	isOrderPaymentAllowedForDelivery,
	type DeliverySettingsNormalized,
	type DeliveryNamedArea,
	type DeliveryPricingStrategy,
	type ExternalDeliveryProvider,
	type NamedAreaResolution,
	type CheckoutFulfillment,
} from "./delivery-settings";
