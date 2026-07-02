import { formatCartAmountPlain, formatCartMoney } from "./format-cart-money";

/** Métodos locales en Venezuela: el cliente paga en bolívares. */
export const VENEZUELA_VES_PAYMENT_METHODS = new Set([
	"pago_movil",
	"transferencia_bancaria",
	"efectivo",
	"tarjeta",
]);

/** Métodos internacionales en Venezuela: el cliente paga en dólares. */
export const VENEZUELA_USD_PAYMENT_METHODS = new Set([
	"zelle",
	"paypal",
	"stripe",
	"mercadopago",
]);

export function isVenezuelaCountry(country: string | null | undefined): boolean {
	const normalized = String(country ?? "").trim();
	return normalized === "VE" || normalized === "Venezuela";
}

export function paymentMethodUsesBolivaresInVenezuela(methodKey: string): boolean {
	return VENEZUELA_VES_PAYMENT_METHODS.has(methodKey);
}

export function paymentMethodUsesUsdInVenezuela(methodKey: string): boolean {
	return VENEZUELA_USD_PAYMENT_METHODS.has(methodKey);
}

export function resolvePaymentAmountDisplay(params: {
	cartTotal: number;
	currency: string;
	exchangeRate: number | null | undefined;
	country: string | null | undefined;
}): string {
	const { cartTotal, currency, exchangeRate, country } = params;
	const primaryTotal = formatCartMoney(cartTotal, currency);

	if (!isVenezuelaCountry(country) || exchangeRate == null || exchangeRate <= 0) {
		return primaryTotal;
	}

	const secondaryCurrency = currency === "USD" ? "VES" : "USD";
	const secondaryTotal = formatCartMoney(cartTotal * exchangeRate, secondaryCurrency);
	return `${primaryTotal} / ${secondaryTotal}`;
}

/** Monto que se copia al portapapeles según país y método de pago. */
export function resolvePaymentAmountCopyValue(params: {
	methodKey: string;
	cartTotal: number;
	currency: string;
	exchangeRate: number | null | undefined;
	country: string | null | undefined;
}): string {
	const { methodKey, cartTotal, currency, exchangeRate, country } = params;
	const primaryTotal = formatCartMoney(cartTotal, currency);

	if (!isVenezuelaCountry(country)) {
		return resolvePaymentAmountDisplay({ cartTotal, currency, exchangeRate, country });
	}

	if (paymentMethodUsesBolivaresInVenezuela(methodKey)) {
		if (exchangeRate != null && exchangeRate > 0) {
			return formatCartAmountPlain(cartTotal * exchangeRate, "VES");
		}
		return primaryTotal;
	}

	if (paymentMethodUsesUsdInVenezuela(methodKey)) {
		return formatCartMoney(cartTotal, "USD");
	}

	return resolvePaymentAmountDisplay({ cartTotal, currency, exchangeRate, country });
}

/** Total formateado para mensajes (WhatsApp, etc.) según método de pago en Venezuela. */
export function resolvePaymentAmountMessageValue(params: {
	methodKey: string | null | undefined;
	grandTotal: number;
	currency: string;
	exchangeRate: number | null | undefined;
	country: string | null | undefined;
	localTotal?: number | null;
	localCurrency?: string | null;
}): string {
	const { methodKey, grandTotal, currency, exchangeRate, country, localTotal, localCurrency } = params;

	if (!isVenezuelaCountry(country) || !methodKey) {
		if (localTotal != null && localTotal > 0 && localCurrency) {
			return `${formatCartMoney(grandTotal, currency)} (${formatCartMoney(localTotal, localCurrency)})`;
		}
		return formatCartMoney(grandTotal, currency);
	}

	if (paymentMethodUsesBolivaresInVenezuela(methodKey)) {
		if (exchangeRate != null && exchangeRate > 0) {
			const vesTotal = grandTotal * exchangeRate;
			return `${formatCartMoney(vesTotal, "VES")} (${formatCartMoney(grandTotal, "USD")})`;
		}
		return formatCartMoney(grandTotal, currency);
	}

	if (paymentMethodUsesUsdInVenezuela(methodKey)) {
		return formatCartMoney(grandTotal, "USD");
	}

	if (localTotal != null && localTotal > 0 && localCurrency) {
		return `${formatCartMoney(grandTotal, currency)} (${formatCartMoney(localTotal, localCurrency)})`;
	}
	return formatCartMoney(grandTotal, currency);
}
