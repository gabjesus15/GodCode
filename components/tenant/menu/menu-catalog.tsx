"use client";

import { memo } from "react";
import Image from "next/image";

import { FIRE_ICON, isPromocionesCategoryName } from "@/lib/tenant/menu/menu-helpers";
import { ProductGrid } from "./product-grid";
import type { MenuCategory, MenuProduct } from "./menu-types";

type MenuCatalogProps = {
	query: string;
	searchQuery: string;
	navigationMode: string;
	activeCategory: string | null;
	specialProducts: MenuProduct[];
	visibleCategories: MenuCategory[];
	productsByCategory: Map<string, MenuProduct[]>;
	filteredBySearch: MenuProduct[];
	cardStyle: string;
	detailsMode: string;
	effectiveCountry: string;
	effectiveCurrency: string;
	exchangeRate?: number | null;
	expandedInlineProductId: string | null;
	onProductClick: (productId: string) => void;
	onCloseInline: () => void;
	inlinePanelRef?: React.RefObject<HTMLDivElement | null>;
	onlineOrderingEnabled?: boolean;
};

export const MenuCatalog = memo(function MenuCatalog({
	query,
	searchQuery,
	navigationMode,
	activeCategory,
	specialProducts,
	visibleCategories,
	productsByCategory,
	filteredBySearch,
	cardStyle,
	detailsMode,
	effectiveCountry,
	effectiveCurrency,
	exchangeRate,
	expandedInlineProductId,
	onProductClick,
	onCloseInline,
	inlinePanelRef,
	onlineOrderingEnabled,
}: MenuCatalogProps) {
	const gridProps = {
		cardStyle,
		detailsMode,
		country: effectiveCountry,
		currency: effectiveCurrency,
		exchangeRate,
		expandedInlineProductId,
		onProductClick,
		onCloseInline,
		inlinePanelRef,
		onlineOrderingEnabled,
	};

	if (query) {
		return (
			<section id="section-search" className="category-section">
				<h2 className="category-title">Resultados para &quot;{searchQuery.trim()}&quot;</h2>
				{filteredBySearch.length > 0 ? (
					<ProductGrid products={filteredBySearch} {...gridProps} />
				) : (
					<p className="no-results-text">No hay platos con ese nombre.</p>
				)}
			</section>
		);
	}

	return (
		<>
			{(navigationMode === "pagination" ? activeCategory === "special" : true) && specialProducts.length > 0 ? (
				<section id="section-special" className="category-section">
					<h2 className="category-title">
						<Image src={FIRE_ICON} className="category-icon" alt="🔥" width={24} height={24} unoptimized />
						Solo por hoy
					</h2>
					<ProductGrid products={specialProducts} {...gridProps} />
				</section>
			) : null}

			{visibleCategories
				.filter((cat) => navigationMode === "pagination" ? activeCategory === cat.id : true)
				.map((category) => {
					const categoryProducts = productsByCategory.get(category.id) ?? [];
					return (
						<section key={category.id} id={`section-${category.id}`} className="category-section">
							<h2 className="category-title">
								{isPromocionesCategoryName(category.name) ? (
									<>
										{category.name}
										<Image src={FIRE_ICON} className="category-icon" alt="🔥" width={24} height={24} unoptimized />
									</>
								) : (
									category.name
								)}
							</h2>
							{categoryProducts.length > 0 ? (
								<ProductGrid products={categoryProducts} {...gridProps} />
							) : (
								<p className="no-results-text">No hay productos en esta categoría.</p>
							)}
						</section>
					);
				})}
		</>
	);
});
