"use client";

import { create } from "zustand";

import type { ProductCardProduct } from "./product-card-shared";

type SizePickerState = {
	/** Producto con tamaños cuyo selector está abierto, o null. */
	product: ProductCardProduct | null;
	open: (product: ProductCardProduct) => void;
	close: () => void;
};

/**
 * Selector de tamaño compartido: cualquier "Agregar" de un producto con tamaños (tarjeta,
 * panel en línea, stepper) lo abre, y `ProductSizeSheet` (montado una vez en el menú) lo pinta.
 */
export const useSizePickerStore = create<SizePickerState>((set) => ({
	product: null,
	open: (product) => set({ product }),
	close: () => set({ product: null }),
}));
