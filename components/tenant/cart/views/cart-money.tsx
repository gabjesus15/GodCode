"use client";

import clsx from "clsx";

import { useCart } from "../use-cart";
import { formatCartMoney } from "../utils/format-cart-money";

/**
 * Un importe del carrito en la moneda real de los precios. Con `dual` y tasa de
 * cambio (Venezuela) añade la conversión en una segunda línea: solo en los
 * totales, para que las filas intermedias no repitan cada número dos veces.
 */
export function CartMoney({
	amount,
	negative = false,
	dual = false,
	className,
}: {
	amount: number;
	negative?: boolean;
	/** Muestra también la conversión a la moneda local cuando hay tasa. */
	dual?: boolean;
	className?: string;
}) {
	const { currency, exchangeRate } = useCart();
	const sign = negative ? "−" : "";
	const localCurrency = currency === "USD" ? "VES" : "USD";
	const hasLocal = dual && exchangeRate != null && exchangeRate > 0;
	return (
		<span className={clsx("cart-money", className)}>
			<span className="cart-money__main">
				{sign}
				{formatCartMoney(amount, currency)}
			</span>
			{hasLocal ? (
				<span className="cart-money__local">
					{sign}
					{formatCartMoney(amount * exchangeRate, localCurrency)}
				</span>
			) : null}
		</span>
	);
}
