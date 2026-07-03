import { TENANT_UI_CONFIG } from "@/lib/tenant/config/tenant-ui-config";
export function getMenuScrollAnchorPx(): number {
	if (typeof window === "undefined") return 156;

	const section = document.querySelector(".category-section");
	if (section instanceof HTMLElement) {
		const margin = parseFloat(window.getComputedStyle(section).scrollMarginTop);
		if (Number.isFinite(margin) && margin > 0) return margin;
	}

	const mobile = window.matchMedia("(max-width: 600px)").matches;
	if (mobile) return 116;
	const wide = window.matchMedia("(min-width: 1024px)").matches;
	if (wide) return 156;
	return 180;
}
export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function resolveCategoryScrollBehavior(): ScrollBehavior {
	if (prefersReducedMotion()) return "auto";
	if (typeof window !== "undefined" && window.innerWidth <= TENANT_UI_CONFIG.mobileMaxWidthPx) {
		return "auto";
	}
	return "smooth";
}

/** Libera el bloqueo del scroll-spy tras scroll programático o scroll suave */
export function scheduleScrollSpyRelease(
	release: () => void,
	behavior: ScrollBehavior = "auto",
): () => void {
	if (typeof window === "undefined") {
		release();
		return () => {};
	}

	let released = false;
	const done = () => {
		if (released) return;
		released = true;
		release();
	};

	const maxWait = window.setTimeout(done, behavior === "smooth" ? 900 : 120);

	if (behavior === "smooth" && "onscrollend" in window) {
		const onEnd = () => {
			window.removeEventListener("scrollend", onEnd);
			window.clearTimeout(maxWait);
			done();
		};
		window.addEventListener("scrollend", onEnd, { once: true });
	}

	return () => {
		released = true;
		window.clearTimeout(maxWait);
	};
}

export function syncNavbarCategoryTab(navbarType: string, activeCategory: string | null) {
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
}
