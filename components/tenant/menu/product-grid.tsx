"use client";

import React, { memo } from "react";

import { productCardGridClass } from "@/lib/store-theme/theme-config";
import { useProductDetailsInteraction } from "./use-product-details-interaction";
import { ProductCard } from "./product-card";
import { ProductInlinePanel } from "./product-inline-panel";
import type { MenuProduct } from "./menu-types";

export type ProductGridProps = {
	products: MenuProduct[];
	cardStyle: string;
	detailsMode: string;
	country: string;
	currency: string;
	exchangeRate?: number | null;
	expandedInlineProductId: string | null;
	onProductClick: (productId: string) => void;
	onCloseInline: () => void;
	inlinePanelRef?: React.RefObject<HTMLDivElement | null>;
	onlineOrderingEnabled?: boolean;
};

export const ProductGrid = memo(function ProductGrid({
	products,
	cardStyle,
	detailsMode,
	country,
	currency,
	exchangeRate,
	expandedInlineProductId,
	onProductClick,
	onCloseInline,
	inlinePanelRef,
	onlineOrderingEnabled,
}: ProductGridProps) {
	const interaction = useProductDetailsInteraction(detailsMode, cardStyle, onProductClick);

	return (
		<div className="product-grid-container">
			<div className={`product-grid ${productCardGridClass(cardStyle)}`}>
			{products.flatMap((product, index) => {
				const card = (
					<ProductCard
						key={product.id}
						product={product}
						priority={index < 6}
						country={country}
						currency={currency}
						cardStyle={cardStyle}
						detailsMode={detailsMode}
						onProductClick={interaction.productClickHandler}
						inlineDetails={interaction.inlineDetails}
						exchangeRate={exchangeRate}
					/>
				);

				if (interaction.showLayoutInlinePanel && expandedInlineProductId === product.id) {
					return [
						card,
						<ProductInlinePanel
							key={`inline-${product.id}`}
							product={product}
							currency={currency}
							country={country}
							exchangeRate={exchangeRate}
							onlineOrderingEnabled={onlineOrderingEnabled}
							onClose={onCloseInline}
							panelRef={inlinePanelRef}
						/>,
					];
				}

				return [card];
			})}
			</div>
		</div>
	);
});
