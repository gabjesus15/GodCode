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

		const controller = catalogScrollRef.current;
		if (controller) {
			// El scroll-spy queda quieto hasta que el desplazamiento termina de verdad
			// (correcciones incluidas): si se soltaba antes, la tira pasaba por las
			// categorías intermedias mientras la página volaba hacia la elegida.
			releaseSpyRef.current?.();
			observerBlockRef.current = true;
			const safety = window.setTimeout(() => {
				observerBlockRef.current = false;
			}, 6000);
			const cancelScroll = controller.scrollToSection(id, behavior, () => {
				window.clearTimeout(safety);
				observerBlockRef.current = false;
			});
			releaseSpyRef.current = () => {
				window.clearTimeout(safety);
				cancelScroll();
			};
			return;
		}

		blockScrollSpy(behavior);

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
		// Secciones y línea del navbar se leen una vez (y al redimensionar), no en
		// cada frame: querySelectorAll + getComputedStyle por frame costaban.
		let sections: HTMLElement[] = [];
		let anchorPx = 0;
		const measure = () => {
			sections = Array.from(document.querySelectorAll<HTMLElement>(".category-section"));
			anchorPx = getMenuScrollAnchorPx();
		};

		const resolveActiveSection = () => {
			if (observerBlockRef.current) return;
			if (sections.length === 0 || !sections[0].isConnected) measure();
			const id = resolveActiveSectionIdFromDom(anchorPx, sections);
			if (id && id !== activeCategoryRef.current) {
				setActiveCategory(id);
			}
		};

		const onScroll = () => {
			cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(resolveActiveSection);
		};

		measure();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", measure);
		resolveActiveSection();

		return () => {
			cancelAnimationFrame(rafId);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", measure);
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
