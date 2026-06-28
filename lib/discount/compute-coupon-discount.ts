/**
 * Descuento de cupón alineado con `create_order_transaction` (Postgres `round(x, 2)` en %).
 */
export function computeCouponDiscountAmount(
	subtotal: number,
	discountType: string,
	discountValue: unknown,
): number {
	const v = Number(discountValue);
	if (!Number.isFinite(v)) return 0;
	if (discountType === "percent") {
		const pct = Math.min(100, Math.max(0, v));
		const raw = (subtotal * pct) / 100;
		return Math.round(raw * 100) / 100;
	}
	if (discountType === "fixed_amount") {
		return Math.min(subtotal, Math.max(0, v));
	}
	return 0;
}
