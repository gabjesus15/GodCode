"use client";

import { useEffect, useMemo } from "react";

import { isCloudinaryImageUrl } from "@/lib/tenant/images/is-cloudinary-image-url";
import { FIRE_ICON, isPromocionesCategoryName } from "@/lib/tenant/menu/menu-helpers";
import type { CategoryListItem, MenuCategory, MenuProduct } from "./menu-types";

export function useMenuCatalogData(
	products: MenuProduct[],
	categories: MenuCategory[],
	searchQuery: string,
	visibleCategories: MenuCategory[],
	setActiveCategory: (id: string | null) => void,
) {
	const { specialProducts, filteredBySearch, query } = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		const promoIds = categories.filter((cat) => isPromocionesCategoryName(cat.name)).map((cat) => cat.id);
		return {
			specialProducts: products.filter((p) => p.is_special && promoIds.includes(p.category_id ?? "")),
			filteredBySearch: q ? products.filter((p) => p.name?.toLowerCase().includes(q)) : [],
			query: q,
		};
	}, [products, categories, searchQuery]);

	useEffect(() => {
		if (specialProducts.length > 0) setActiveCategory("special");
		else if (visibleCategories[0]?.id) setActiveCategory(visibleCategories[0].id);
		else setActiveCategory(null);
	}, [specialProducts.length, visibleCategories, setActiveCategory]);

	const productsByCategory = useMemo(() => {
		const grouped = new Map<string, MenuProduct[]>();
		for (const product of products) {
			const categoryId = product.category_id ?? "";
			const list = grouped.get(categoryId);
			if (list) list.push(product);
			else grouped.set(categoryId, [product]);
		}
		return grouped;
	}, [products]);

	const categoriesList = useMemo<CategoryListItem[]>(() => [
		...(specialProducts.length > 0 ? [{ id: "special", name: "Solo por hoy", icon: FIRE_ICON }] : []),
		...visibleCategories.map((cat) => {
			const catFirstProduct = products.find(
				(p) =>
					p.category_id === cat.id &&
					p.image_url &&
					!isCloudinaryImageUrl(p.image_url),
			);
			return {
				id: cat.id,
				name: cat.name,
				icon: isPromocionesCategoryName(cat.name) ? FIRE_ICON : catFirstProduct?.image_url ?? null,
			};
		}),
	], [specialProducts.length, visibleCategories, products]);

	return {
		specialProducts,
		filteredBySearch,
		query,
		productsByCategory,
		categoriesList,
	};
}
