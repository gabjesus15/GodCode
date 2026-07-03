import type { MenuProduct } from "@/components/tenant/menu/menu-types";

type CollectCatalogProductIdsArgs = {
	query: string;
	navigationMode: string;
	activeCategory: string | null;
	specialProducts: MenuProduct[];
	visibleCategories: { id: string }[];
	productsByCategory: Map<string, MenuProduct[]>;
	filteredBySearch: MenuProduct[];
};

export function collectCatalogProductIdsInRenderOrder({
	query,
	navigationMode,
	activeCategory,
	specialProducts,
	visibleCategories,
	productsByCategory,
	filteredBySearch,
}: CollectCatalogProductIdsArgs): string[] {
	if (query) {
		return filteredBySearch.map((product) => product.id);
	}

	const ids: string[] = [];
	const showSpecial = navigationMode === "pagination" ? activeCategory === "special" : true;

	if (showSpecial && specialProducts.length > 0) {
		for (const product of specialProducts) {
			ids.push(product.id);
		}
	}

	for (const category of visibleCategories) {
		if (navigationMode === "pagination" && activeCategory !== category.id) {
			continue;
		}
		const categoryProducts = productsByCategory.get(category.id) ?? [];
		for (const product of categoryProducts) {
			ids.push(product.id);
		}
	}

	return ids;
}
