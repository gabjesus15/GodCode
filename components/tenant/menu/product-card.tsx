import React, { useCallback } from "react";

import { normalizeProductCardStyle } from "@/lib/store-theme/theme-config";
import { GlassCard } from "./glass-card";
import { useProductCardLogic, type ProductCardProduct } from "./product-card-shared";
import {
	CleanCard,
	DetailedCard,
	FoodCard,
	HorizontalCard,
	RappiCard,
	SidebarCard,
	SkewCard,
	SneakerCard,
} from "./product-card-layouts";

export const ProductCard = React.memo(function ProductCard({
	product,
	priority = false,
	country = "CL",
	currency = "CLP",
	cardStyle = "layout-clean",
	detailsMode = "modal-premium",
	onClick,
	onProductClick,
	inlineDetails = false,
	exchangeRate,
}: {
	product: ProductCardProduct;
	priority?: boolean;
	country?: string;
	currency?: string;
	cardStyle?: string;
	detailsMode?: string;
	onClick?: () => void;
	onProductClick?: (productId: string) => void;
	inlineDetails?: boolean;
	exchangeRate?: number | null;
}) {
	const logic = useProductCardLogic(product, country);
	const resolvedStyle = normalizeProductCardStyle(cardStyle);

	const stableProductClick = useCallback(() => {
		onProductClick?.(product.id);
	}, [onProductClick, product.id]);

	const layoutProps = {
		product,
		logic,
		currency,
		priority,
		onClick: onProductClick ? stableProductClick : onClick,
		detailsMode,
		exchangeRate,
	};

	switch (resolvedStyle) {
		case "glass":
			return (
				<GlassCard
					product={product}
					logic={logic}
					currency={currency}
					priority={priority}
					detailsMode={detailsMode}
					onClick={onClick}
					onProductClick={onProductClick}
					inlineDetails={inlineDetails}
					exchangeRate={exchangeRate}
				/>
			);
		case "layout-detailed":
			return <DetailedCard {...layoutProps} />;
		case "layout-horizontal":
			return <HorizontalCard {...layoutProps} />;
		case "layout-sidebar":
			return <SidebarCard {...layoutProps} />;
		case "layout-rappi":
			return <RappiCard {...layoutProps} />;
		case "layout-sneaker":
			return <SneakerCard {...layoutProps} />;
		case "layout-skew":
			return <SkewCard {...layoutProps} />;
		case "layout-food":
			return <FoodCard {...layoutProps} />;
		case "layout-clean":
		default:
			return <CleanCard {...layoutProps} />;
	}
});
