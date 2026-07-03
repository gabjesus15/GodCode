
/** Virtualización por sección desactivada: provoca saltos de scroll al medir alturas hacia arriba. */
export function shouldVirtualizeMenuCatalog(
	_query: string,
	_navigationMode: string,
	_catalogProductCount: number,
): boolean {
	return false;
}

export function countVisibleCatalogProducts(
	specialProductsCount: number,
	visibleCategories: { id: string }[],
	productsByCategory: Map<string, unknown[]>,
): number {
	let count = specialProductsCount;
	for (const category of visibleCategories) {
		count += productsByCategory.get(category.id)?.length ?? 0;
	}
	return count;
}
