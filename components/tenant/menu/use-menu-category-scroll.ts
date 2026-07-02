"use client";

import { useCallback, useEffect, useRef } from "react";

import { resolveHomeCategoryId } from "@/lib/tenant/menu/menu-helpers";
import type { BottomNavTab } from "./menu-types";

type UseMenuCategoryScrollArgs = {
	navigationMode: string;
	navbarType: string;
	query: string;
	visibleCategoryIds: string[];
	specialProductsCount: number;
	activeCategory: string | null;
	setActiveCategory: (id: string) => void;
	onNavigate?: () => void;
	setActiveBottomTab: (tab: BottomNavTab) => void;
};

export function useMenuCategoryScroll({
	navigationMode,
	navbarType,
	query,
	visibleCategoryIds,
	specialProductsCount,
	activeCategory,
	setActiveCategory,
	onNavigate,
	setActiveBottomTab,
}: UseMenuCategoryScrollArgs) {
	const observerBlockRef = useRef(false);

	const scrollToCategory = useCallback((id: string) => {
		setActiveCategory(id);
		setActiveBottomTab("home");
		onNavigate?.();

		if (navigationMode === "pagination") return;

		observerBlockRef.current = true;
		const element = document.getElementById(`section-${id}`);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
			setTimeout(() => {
				observerBlockRef.current = false;
			}, 800);
		} else {
			observerBlockRef.current = false;
		}
	}, [navigationMode, onNavigate, setActiveBottomTab, setActiveCategory]);

	const scrollToHome = useCallback(() => {
		const homeId = resolveHomeCategoryId(specialProductsCount, visibleCategoryIds);
		if (homeId) scrollToCategory(homeId);
	}, [scrollToCategory, specialProductsCount, visibleCategoryIds]);

	useEffect(() => {
		if (query || navigationMode === "pagination") return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (observerBlockRef.current) return;
				const sorted = entries
					.filter((entry) => entry.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
				if (sorted.length > 0) {
					const id = sorted[0].target.id.replace("section-", "");
					setActiveCategory(id);
				}
			},
			{ root: null, rootMargin: "-80px 0px -80% 0px", threshold: 0 },
		);

		const sections = document.querySelectorAll(".category-section");
		sections.forEach((section) => observer.observe(section));
		return () => observer.disconnect();
	}, [query, navigationMode, setActiveCategory, visibleCategoryIds]);

	useEffect(() => {
		if (!activeCategory) return;
		if (navbarType === "icon-list" || navbarType === "floating-bottom") {
			const container = document.querySelector(".icon-list-categories");
			const activeElement = container?.querySelector(".icon-list-card.active") as HTMLElement | null;
			activeElement?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
		} else if (navbarType === "sidebar-categories") {
			const container = document.querySelector(".sidebar-categories-panel");
			const activeElement = container?.querySelector(".sidebar-nav-item.active") as HTMLElement | null;
			activeElement?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "start" });
		}
	}, [activeCategory, navbarType]);

	return { scrollToCategory, scrollToHome };
}
