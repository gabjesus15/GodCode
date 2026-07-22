"use client";

import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import Image from "next/image";

import { FIRE_ICON, isPromocionesCategoryName } from "@/lib/tenant/menu/menu-helpers";
import type { MenuCatalogScrollController } from "@/lib/tenant/menu/menu-catalog-scroll-controller";
import {
	resolveActiveSectionIdFromDom,
} from "@/lib/tenant/menu/menu-scroll-spy";
import { getMenuScrollAnchorPx } from "@/lib/tenant/menu/menu-scroll";
import { ProductGrid, type ProductGridProps } from "./product-grid";
import type { MenuCategory, MenuProduct } from "./menu-types";

type GridProps = Omit<ProductGridProps, "products">;

type VirtualSection = {
	id: string;
	title: ReactNode;
	products: MenuProduct[];
	emptyText?: string;
};

type VirtualizedMenuCatalogProps = {
	specialProducts: MenuProduct[];
	visibleCategories: MenuCategory[];
	productsByCategory: Map<string, MenuProduct[]>;
	gridProps: GridProps;
	catalogScrollRef: React.RefObject<MenuCatalogScrollController | null>;
	observerBlockRef: React.RefObject<boolean>;
	onActiveSectionChange: (sectionId: string) => void;
};

function estimateSectionHeight(section: VirtualSection, cardStyle: string): number {
	const count = section.products.length;
	if (count === 0) return 160;
	const cols = cardStyle === "horizontal" ? 1 : 2;
	const rows = Math.ceil(count / cols);
	const rowHeight = cardStyle === "tall" ? 360 : cardStyle === "horizontal" ? 220 : 320;
	// Margen superior de .category-section + buffer para evitar saltos al medir hacia arriba
	return Math.ceil((168 + rows * rowHeight + 48) * 1.12);
}

export const VirtualizedMenuCatalog = memo(function VirtualizedMenuCatalog({
	specialProducts,
	visibleCategories,
	productsByCategory,
	gridProps,
	catalogScrollRef,
	observerBlockRef,
	onActiveSectionChange,
}: VirtualizedMenuCatalogProps) {
	const [scrollAnchor, setScrollAnchor] = useState(() => getMenuScrollAnchorPx());
	const activeSectionRef = useRef<string | null>(null);
	const onActiveSectionChangeRef = useRef(onActiveSectionChange);

	useEffect(() => {
		onActiveSectionChangeRef.current = onActiveSectionChange;
	}, [onActiveSectionChange]);

	const sections = useMemo(() => {
		const items: VirtualSection[] = [];

		if (specialProducts.length > 0) {
			items.push({
				id: "special",
				title: (
					<>
						<Image src={FIRE_ICON} className="category-icon" alt="🔥" width={24} height={24} unoptimized />
						Solo por hoy
					</>
				),
				products: specialProducts,
			});
		}

		for (const category of visibleCategories) {
			const categoryProducts = productsByCategory.get(category.id) ?? [];
			items.push({
				id: category.id,
				title: isPromocionesCategoryName(category.name) ? (
					<>
						{category.name}
						<Image src={FIRE_ICON} className="category-icon" alt="🔥" width={24} height={24} unoptimized />
					</>
				) : (
					category.name
				),
				products: categoryProducts,
				emptyText: "No hay productos en esta categoría.",
			});
		}

		return items;
	}, [productsByCategory, specialProducts, visibleCategories]);

	const sectionIndexById = useMemo(() => {
		const map = new Map<string, number>();
		sections.forEach((section, index) => map.set(section.id, index));
		return map;
	}, [sections]);

	const virtualizer = useWindowVirtualizer({
		count: sections.length,
		estimateSize: (index) => estimateSectionHeight(sections[index], gridProps.cardStyle),
		overscan: 5,
		scrollMargin: scrollAnchor,
		gap: 40,
		shouldAdjustScrollPositionOnItemSizeChange: (item, delta, instance) => {
			if (instance.isScrolling && instance.scrollDirection === "backward") {
				return false;
			}
			if (instance.isScrolling && delta > 0) {
				return false;
			}
			const scrollOffset = instance.scrollOffset ?? 0;
			return item.start < scrollOffset;
		},
	});

	useEffect(() => {
		const syncAnchor = () => setScrollAnchor(getMenuScrollAnchorPx());
		syncAnchor();
		window.addEventListener("resize", syncAnchor);
		return () => window.removeEventListener("resize", syncAnchor);
	}, []);

	useEffect(() => {
		catalogScrollRef.current = {
			isVirtualized: true,
			scrollToSection(sectionId: string, behavior: ScrollBehavior = "auto") {
				const index = sectionIndexById.get(sectionId);
				if (index == null) return;
				virtualizer.scrollToIndex(index, {
					align: "start",
					behavior,
				});
			},
		};
		return () => {
			if (catalogScrollRef.current?.isVirtualized) {
				catalogScrollRef.current = null;
			}
		};
	}, [catalogScrollRef, sectionIndexById, virtualizer]);

	useEffect(() => {
		let rafId = 0;

		const resolveActiveSection = () => {
			if (observerBlockRef.current) return;

			const anchor = getMenuScrollAnchorPx();
			let nextId = resolveActiveSectionIdFromDom(anchor);

			if (!nextId) {
				const scrollTop = virtualizer.scrollOffset ?? window.scrollY;
				const item = virtualizer.getVirtualItemForOffset(scrollTop + anchor);
				nextId = item != null ? sections[item.index]?.id : sections[0]?.id;
			}

			if (!nextId || nextId === activeSectionRef.current) return;
			activeSectionRef.current = nextId;
			onActiveSectionChangeRef.current(nextId);
		};

		const onScroll = () => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(resolveActiveSection);
		};

		window.addEventListener("scroll", onScroll, { passive: true });
		resolveActiveSection();

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener("scroll", onScroll);
		};
	}, [observerBlockRef, sections, virtualizer]);

	return (
		<div
			className="virtualized-menu-catalog"
			style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative", width: "100%" }}
		>
			{virtualizer.getVirtualItems().map((virtualRow) => {
				const section = sections[virtualRow.index];
				return (
					<section
						key={section.id}
						id={`section-${section.id}`}
						data-index={virtualRow.index}
						ref={virtualizer.measureElement}
						className="category-section"
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							transform: `translateY(${virtualRow.start}px)`,
						}}
					>
						<h2 className="category-title">{section.title}</h2>
						{section.products.length > 0 ? (
							<ProductGrid products={section.products} {...gridProps} />
						) : (
							<p className="no-results-text">{section.emptyText ?? "No hay productos en esta categoría."}</p>
						)}
					</section>
				);
			})}
		</div>
	);
});
