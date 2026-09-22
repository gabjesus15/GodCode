"use client";

import { useCallback, useEffect, useRef } from "react";

import type { MenuCatalogScrollController } from "@/lib/tenant/menu/menu-catalog-scroll-controller";
import { resolveHomeCategoryId } from "@/lib/tenant/menu/menu-helpers";
import { resolveActiveSectionIdFromDom } from "@/lib/tenant/menu/menu-scroll-spy";
import {
	getMenuScrollAnchorPx,
	prefersReducedMotion,
	resolveCategoryScrollBehavior,
	scheduleScrollSpyRelease,
	syncNavbarCategoryTab,
} from "@/lib/tenant/menu/menu-scroll";
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
	catalogScrollRef: React.RefObject<MenuCatalogScrollController | null>;
	useVirtualizedCatalog: boolean;
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
	catalogScrollRef,
	useVirtualizedCatalog,
}: UseMenuCategoryScrollArgs) {
	const observerBlockRef = useRef(false);
	const releaseSpyRef = useRef<(() => void) | null>(null);
	const activeCategoryRef = useRef(activeCategory);

	useEffect(() => {
		activeCategoryRef.current = activeCategory;
	}, [activeCategory]);

	const blockScrollSpy = useCallback((behavior: ScrollBehavior = "auto") => {
		releaseSpyRef.current?.();
		observerBlockRef.current = true;
		releaseSpyRef.current = scheduleScrollSpyRelease(() => {
			observerBlockRef.current = false;
		}, behavior);
	}, []);

	const scrollToCategory = useCallback((id: string) => {
		setActiveCategory(id);
		setActiveBottomTab("home");
		onNavigate?.();

		if (navigationMode === "pagination") return;

		const behavior = resolveCategoryScrollBehavior();
		blockScrollSpy(behavior);

		const controller = catalogScrollRef.current;
		if (controller) {
			controller.scrollToSection(id, behavior);
			return;
		}

		const element = document.getElementById(`section-${id}`);
		if (element) {
			element.scrollIntoView({ behavior, block: "start" });
		}
	}, [blockScrollSpy, catalogScrollRef, navigationMode, onNavigate, setActiveBottomTab, setActiveCategory]);

	const scrollToHome = useCallback(() => {
		const homeId = resolveHomeCategoryId(specialProductsCount, visibleCategoryIds);
		if (homeId) scrollToCategory(homeId);
	}, [scrollToCategory, specialProductsCount, visibleCategoryIds]);

	// Scroll-spy en catálogo NO virtualizado (el virtualizado lo resuelve en su componente)
	useEffect(() => {
		if (query || navigationMode === "pagination" || useVirtualizedCatalog) return;

		let rafId = 0;

		const resolveActiveSection = () => {
			if (observerBlockRef.current) return;
			const id = resolveActiveSectionIdFromDom(getMenuScrollAnchorPx());
			if (id && id !== activeCategoryRef.current) {
				setActiveCategory(id);
			}
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
	}, [navigationMode, query, setActiveCategory, useVirtualizedCatalog, visibleCategoryIds]);

	useEffect(() => {
		if (!activeCategory) return;
		if (navbarType !== "icon-list" && navbarType !== "floating-bottom" && navbarType !== "sidebar-categories") {
			return;
		}

		// La tira siempre se desliza hasta la activa (también en móvil y al hacer
		// scroll): es un scroll horizontal corto, no el de la página.
		const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";

		const rafId = requestAnimationFrame(() => {
			syncNavbarCategoryTab(navbarType, activeCategory, behavior);
		});

		return () => cancelAnimationFrame(rafId);
	}, [activeCategory, navbarType]);

	useEffect(() => () => {
		releaseSpyRef.current?.();
	}, []);

	return { scrollToCategory, scrollToHome, observerBlockRef };
}
