import type { ProductDetailsMode } from "@/lib/store-theme/theme-config";
import { normalizeProductCardStyle, normalizeProductDetailsMode } from "@/lib/store-theme/theme-config";

export type ProductDetailsInteraction = {
	productClickHandler: ((productId: string) => void) | undefined;
	inlineDetails: boolean;
	showLayoutInlinePanel: boolean;
};

export function resolveProductDetailsInteraction(
	detailsModeRaw: string,
	cardStyleRaw: string,
	onProductClick: (productId: string) => void,
): ProductDetailsInteraction {
	const detailsMode = normalizeProductDetailsMode(detailsModeRaw) as ProductDetailsMode;
	const cardStyle = normalizeProductCardStyle(cardStyleRaw);
	const useGlassInlineExpand = detailsMode === "inline" && cardStyle === "glass";
	const showLayoutInlinePanel = detailsMode === "inline" && !useGlassInlineExpand;
	const productClickHandler =
		detailsMode === "modal-premium" || showLayoutInlinePanel ? onProductClick : undefined;

	return {
		productClickHandler,
		inlineDetails: useGlassInlineExpand,
		showLayoutInlinePanel,
	};
}
