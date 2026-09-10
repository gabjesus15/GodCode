/**
 * Descuento de cupón. **Implementación canónica.**
 *
 * Esta misma función existe, byte a byte, en el Panel POS
 * (`src/lib/discount-coupon.ts`). Ambas replican la aritmética de la RPC
 * `create_order_transaction` de Postgres, que sigue siendo la fuente de verdad:
 * el servidor recalcula el descuento al crear el pedido, y este cálculo es solo
 * para mostrar el total antes de confirmar.
 *
 * Si tocas esta función, aplica el mismo cambio en el Panel y actualiza
 * `coupon-discount-contract-cases.ts` en los dos repositorios. El fichero de
 * casos es idéntico en ambos justamente para que un `diff` detecte la deriva.
 *
 * Reglas, en orden:
 * - Subtotal no finito o negativo cuenta como 0. Un descuento nunca es negativo.
 * - `discount_value` no finito cuenta como 0.
 * - `percent`: el porcentaje se acota a [0, 100] y el resultado se redondea a
 *   2 decimales, igual que el `round(x, 2)` de Postgres.
 * - `fixed_amount`: se acota a [0, subtotal]. Un cupón nunca deja el total en
 *   negativo ni devuelve dinero.
 * - Cualquier otro `discount_type` da 0, no lanza: un tipo nuevo en la base de
 *   datos no debe romper el carrito.
 */
export function computeCouponDiscountAmount(
	subtotal: number,
	discountType: string,
	discountValue: unknown,
): number {
	const base = Number(subtotal);
	const safeSubtotal = Number.isFinite(base) && base > 0 ? base : 0;

	const value = Number(discountValue);
	if (!Number.isFinite(value)) return 0;

	if (discountType === "percent") {
		const pct = Math.min(100, Math.max(0, value));
		return Math.round(((safeSubtotal * pct) / 100) * 100) / 100;
	}

	if (discountType === "fixed_amount") {
		return Math.min(safeSubtotal, Math.max(0, value));
	}

	return 0;
}
