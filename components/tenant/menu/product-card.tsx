import React, { useCallback } from "react";

import { normalizeProductCardStyle } from "@/lib/store-theme/theme-config";
import { GlassCard, type GlassCardVariant } from "./glass-card";
import { useProductCardLogic, type ProductCardProduct } from "./product-card-shared";
import { CartaCard, CartelCard, NoriCard, VitrinaCard } from "./product-card-food-layouts";

export const ProductCard = React.memo(function ProductCard({
	product,
	priority = false,
	country = "CL",
	currency = "CLP",
	cardStyle = "glass",
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
		case "layout-carta":
			return <CartaCard {...layoutProps} />;
		case "layout-vitrina":
			return <VitrinaCard {...layoutProps} />;
		case "layout-cartel":
			return <CartelCard {...layoutProps} />;
		case "layout-nori":
			return <NoriCard {...layoutProps} />;
		default:
			return (
				<GlassCard
					variant={GLASS_VARIANTS[resolvedStyle]}
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
	}
});

const GLASS_VARIANTS: Record<string, GlassCardVariant> = {
	glass: "grid",
	"glass-row": "row",
	"glass-plate": "plate",
	"glass-wide": "wide",
};
