"use client";

import { useMemo } from "react";

import {
	resolveProductDetailsInteraction,
	type ProductDetailsInteraction,
} from "@/lib/tenant/menu/product-details-interaction";

export function useProductDetailsInteraction(
	detailsMode: string,
	cardStyle: string,
	onProductClick: (productId: string) => void,
): ProductDetailsInteraction {
	return useMemo(
		() => resolveProductDetailsInteraction(detailsMode, cardStyle, onProductClick),
		[detailsMode, cardStyle, onProductClick],
	);
}
