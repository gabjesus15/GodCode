import { isoFractionDigits } from "./minor-units";

/**
 * Redondea un monto a los decimales de su moneda: CLP a enteros, USD a centavos.
 *
 * Antes el carrito y la ruta del pedido usaban `Math.round` para todo, así que en
 * dólares $12.99 + $8.50 quedaba en $21. La base ya guarda el total con 2 decimales
 * (`create_order_transaction`), así que esto solo deja de perder los centavos.
 * Con un código de moneda inválido se usan 2 decimales: nunca se pierde dinero.
 */
export function moneyFractionDigits(currency: string | null | undefined): number {
	try {
		return isoFractionDigits(String(currency ?? ""));
	} catch {
		return 2;
	}
}

export function roundMoney(value: number, currency: string | null | undefined): number {
	if (!Number.isFinite(value)) return 0;
	const factor = 10 ** moneyFractionDigits(currency);
	return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** Para sumas de precios ya guardados cuando no se conoce la moneda: a centavos, nunca a enteros. */
export function roundToCents(value: number): number {
	if (!Number.isFinite(value)) return 0;
	return Math.round((value + Number.EPSILON) * 100) / 100;
}
