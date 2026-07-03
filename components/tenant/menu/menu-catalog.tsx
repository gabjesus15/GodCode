"use client";

import { memo, useEffect, useMemo } from "react";
import Image from "next/image";

import { FIRE_ICON, isPromocionesCategoryName } from "@/lib/tenant/menu/menu-helpers";
import { buildPriorityProductIdSet } from "@/lib/tenant/images/resolve-product-priority";
import { collectCatalogProductIdsInRenderOrder } from "@/lib/tenant/menu/collect-catalog-product-ids";
import { countVisibleCatalogProducts, shouldVirtualizeMenuCatalog } from "@/lib/tenant/menu/menu-catalog-virtualization";
import type { MenuCatalogScrollController } from "@/lib/tenant/menu/menu-catalog-scroll-controller";
import { resolveCategoryScrollBehavior } from "@/lib/tenant/menu/menu-scroll";
import { ProductGrid } from "./product-grid";
import { VirtualizedMenuCatalog } from "./virtualized-menu-catalog";
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
	catalogScrollRef: React.RefObject<MenuCatalogScrollController | null>;
	observerBlockRef: React.RefObject<boolean>;
	onActiveSectionChange: (sectionId: string) => void;
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
	catalogScrollRef,
	observerBlockRef,
	onActiveSectionChange,
}: MenuCatalogProps) {
	const priorityProductIds = useMemo(() => {
		const orderedIds = collectCatalogProductIdsInRenderOrder({
			query,
			navigationMode,
			activeCategory,
			specialProducts,
			visibleCategories,
			productsByCategory,
			filteredBySearch,
		});
		return buildPriorityProductIdSet(orderedIds);
	}, [
		activeCategory,
		filteredBySearch,
		navigationMode,
		productsByCategory,
		query,
		specialProducts,
		visibleCategories,
	]);

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
		priorityProductIds,
	};

	const catalogProductCount = useMemo(
		() => countVisibleCatalogProducts(specialProducts.length, visibleCategories, productsByCategory),
		[productsByCategory, specialProducts.length, visibleCategories],
	);

	const useVirtualizedScroll = shouldVirtualizeMenuCatalog(query, navigationMode, catalogProductCount);

	// Catálogo clásico: registrar scroll por sección en DOM
	useEffect(() => {
		if (useVirtualizedScroll || query) {
			return;
		}

		catalogScrollRef.current = {
			isVirtualized: false,
			scrollToSection(sectionId: string, behavior?: ScrollBehavior) {
				const element = document.getElementById(`section-${sectionId}`);
				element?.scrollIntoView({
					behavior: behavior ?? resolveCategoryScrollBehavior(),
					block: "start",
				});
			},
		};

		return () => {
			if (catalogScrollRef.current && !catalogScrollRef.current.isVirtualized) {
				catalogScrollRef.current = null;
			}
		};
	}, [catalogScrollRef, query, useVirtualizedScroll, visibleCategories, specialProducts.length]);

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

	if (useVirtualizedScroll) {
		return (
			<VirtualizedMenuCatalog
				specialProducts={specialProducts}
				visibleCategories={visibleCategories}
				productsByCategory={productsByCategory}
				gridProps={gridProps}
				catalogScrollRef={catalogScrollRef}
				observerBlockRef={observerBlockRef}
				onActiveSectionChange={onActiveSectionChange}
			/>
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