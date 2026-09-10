/**
 * Casos de contrato del descuento de cupón.
 *
 * **Este fichero es idéntico en los dos repositorios**, en:
 * - `saas-godcode-admin/lib/discount/coupon-discount-contract-cases.ts`
 * - `Saas-Godcode-paneladmin-ceo/src/lib/coupon-discount-contract-cases.ts`
 *
 * Los dos frontends calculan el descuento por su cuenta para mostrar el total
 * antes de confirmar, mientras la RPC `create_order_transaction` lo recalcula en
 * Postgres al crear el pedido. Tres implementaciones de la misma aritmética, sin
 * nada que las ate: si una cambia y las otras no, el cliente ve un total y paga
 * otro.
 *
 * Esta tabla es el amarre. Al cambiar la regla de descuento:
 * 1. Actualiza el caso aquí.
 * 2. Copia el fichero al otro repositorio. Comprueba con:
 *    `diff --strip-trailing-cr <ruta-portal> <ruta-panel>` (debe salir vacío).
 * 3. Aplica el cambio en la RPC de Postgres.
 */

export type CouponDiscountCase = {
	name: string;
	subtotal: number;
	discountType: string;
	discountValue: unknown;
	expected: number;
};

export const COUPON_DISCOUNT_CONTRACT_CASES: CouponDiscountCase[] = [
	// --- percent: camino normal ---
	{ name: "percent 10% sobre 100", subtotal: 100, discountType: "percent", discountValue: 10, expected: 10 },
	{ name: "percent 50% sobre 99.99", subtotal: 99.99, discountType: "percent", discountValue: 50, expected: 50 },
	{ name: "percent 100% deja el total en cero", subtotal: 250, discountType: "percent", discountValue: 100, expected: 250 },
	{ name: "percent 0% no descuenta", subtotal: 250, discountType: "percent", discountValue: 0, expected: 0 },

	// --- percent: redondeo a 2 decimales, como el round(x, 2) de Postgres ---
	{ name: "percent redondea hacia arriba", subtotal: 10.05, discountType: "percent", discountValue: 33, expected: 3.32 },
	{ name: "percent redondea hacia abajo", subtotal: 3.33, discountType: "percent", discountValue: 33, expected: 1.1 },
	{ name: "percent con tercer decimal exacto", subtotal: 1, discountType: "percent", discountValue: 12.345, expected: 0.12 },

	// --- percent: valores fuera de rango se acotan ---
	{ name: "percent mayor que 100 se acota a 100", subtotal: 80, discountType: "percent", discountValue: 150, expected: 80 },
	{ name: "percent negativo se acota a 0", subtotal: 80, discountType: "percent", discountValue: -20, expected: 0 },

	// --- fixed_amount ---
	{ name: "fixed_amount por debajo del subtotal", subtotal: 100, discountType: "fixed_amount", discountValue: 15, expected: 15 },
	{ name: "fixed_amount igual al subtotal", subtotal: 40, discountType: "fixed_amount", discountValue: 40, expected: 40 },
	{ name: "fixed_amount mayor que el subtotal se acota", subtotal: 40, discountType: "fixed_amount", discountValue: 100, expected: 40 },
	{ name: "fixed_amount negativo cuenta como 0", subtotal: 40, discountType: "fixed_amount", discountValue: -10, expected: 0 },
	{ name: "fixed_amount conserva decimales", subtotal: 40, discountType: "fixed_amount", discountValue: 12.5, expected: 12.5 },

	// --- subtotales degenerados: nunca producen descuento negativo ---
	{ name: "subtotal cero", subtotal: 0, discountType: "percent", discountValue: 50, expected: 0 },
	{ name: "subtotal negativo cuenta como 0 (percent)", subtotal: -100, discountType: "percent", discountValue: 50, expected: 0 },
	{ name: "subtotal negativo cuenta como 0 (fixed_amount)", subtotal: -100, discountType: "fixed_amount", discountValue: 10, expected: 0 },
	{ name: "subtotal NaN cuenta como 0", subtotal: Number.NaN, discountType: "percent", discountValue: 50, expected: 0 },
	{ name: "subtotal infinito cuenta como 0", subtotal: Number.POSITIVE_INFINITY, discountType: "percent", discountValue: 50, expected: 0 },

	// --- discount_value degenerado ---
	{ name: "discountValue null cuenta como 0", subtotal: 100, discountType: "percent", discountValue: null, expected: 0 },
	{ name: "discountValue undefined cuenta como 0", subtotal: 100, discountType: "percent", discountValue: undefined, expected: 0 },
	{ name: "discountValue texto no numerico cuenta como 0", subtotal: 100, discountType: "percent", discountValue: "abc", expected: 0 },
	{ name: "discountValue texto numerico si cuenta", subtotal: 100, discountType: "percent", discountValue: "25", expected: 25 },

	// --- tipo desconocido: devuelve 0, no lanza ---
	{ name: "discount_type desconocido no descuenta", subtotal: 100, discountType: "buy_one_get_one", discountValue: 50, expected: 0 },
	{ name: "discount_type vacio no descuenta", subtotal: 100, discountType: "", discountValue: 50, expected: 0 },
];
