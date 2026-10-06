"use client";

import { useSizePickerStore } from "./product-size-store";
// Diferida, como el detalle de producto: con el import directo la hoja (y
// framer-motion) entraban en la carga inicial del menú.
import { LazyProductDetailsModal as ProductDetailsSheet } from "@/lib/tenant/lazy/tenant-dynamic";

/**
 * "Agregar" en una tarjeta o en el panel en línea de un producto con tamaños o
 * variantes no agrega a ciegas: abre la hoja de producto completa (foto que crece con
 * el tamaño, variantes, cantidad). Se monta una sola vez en el menú y la abre
 * `useSizePickerStore`; es la misma hoja que el detalle de producto, así la persona
 * aprende un solo gesto.
 */
export function ProductSizeSheet({
	country = "CL",
	currency = "CLP",
	exchangeRate,
	onlineOrderingEnabled,
}: {
	country?: string;
	currency?: string;
	exchangeRate?: number | null;
	onlineOrderingEnabled?: boolean;
}) {
	const product = useSizePickerStore((state) => state.product);
	const close = useSizePickerStore((state) => state.close);
	if (!product) return null;
	return (
		<ProductDetailsSheet
			key={product.id}
			isOpen
			onClose={close}
			product={product}
			country={country}
			currency={currency}
			exchangeRate={exchangeRate}
			onlineOrderingEnabled={onlineOrderingEnabled}
		/>
	);
}
