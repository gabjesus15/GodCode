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

/**
 * Suave siempre, también en móvil (el `html` ya lleva scroll-behavior: smooth,
 * así que "auto" era suave igualmente). Con "reducir movimiento" es "instant":
 * "auto" heredaría ese smooth del CSS y seguiría animando.
 */
export function resolveCategoryScrollBehavior(): ScrollBehavior {
	return prefersReducedMotion() ? "instant" : "smooth";
}

/** Llama a `done` cuando el scroll de la página se detiene (o tras `maxMs`). */
function waitForScrollEnd(done: () => void, maxMs = 2500): () => void {
	let finished = false;
	const finish = () => {
		if (finished) return;
		finished = true;
		cleanup();
		done();
	};
	// Si no hay nada que desplazar, scrollend no llega: basta con un rato sin scroll.
	let idle = window.setTimeout(finish, 180);
	const onScroll = () => {
		window.clearTimeout(idle);
		idle = window.setTimeout(finish, "onscrollend" in window ? maxMs : 140);
	};
	const hardStop = window.setTimeout(finish, maxMs);
	const cleanup = () => {
		window.clearTimeout(idle);
		window.clearTimeout(hardStop);
		window.removeEventListener("scroll", onScroll);
		window.removeEventListener("scrollend", finish);
	};
	window.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("scrollend", finish);
	return () => {
		finished = true;
		cleanup();
	};
}

/**
 * scrollIntoView que aterriza donde debe. Las tarjetas fuera de pantalla usan
 * una altura estimada (content-visibility) y, al pintarse durante el trayecto,
 * la sección de destino se mueve: un salto largo podía quedar a cientos de px.
 * Al detenerse, si no quedó alineada, corrige con un tramo corto (máx. 3).
 * Si la persona toca o usa la rueda, se deja de corregir. Devuelve cancelar.
 */
export function scrollSectionIntoViewSettled(
	element: HTMLElement,
	behavior: ScrollBehavior,
	onSettled?: () => void,
): () => void {
	let cancelled = false;
	let passes = 0;
	let stopWaiting = () => {};

	const stopOnUser = () => cancel(true);
	const cancel = (settle: boolean) => {
		if (cancelled) return;
		cancelled = true;
		stopWaiting();
		window.removeEventListener("wheel", stopOnUser);
		window.removeEventListener("touchstart", stopOnUser);
		if (settle) onSettled?.();
	};
	window.addEventListener("wheel", stopOnUser, { passive: true });
	window.addEventListener("touchstart", stopOnUser, { passive: true });

	const misalignment = () =>
		element.getBoundingClientRect().top - (parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0);

	const run = () => {
		element.scrollIntoView({ behavior, block: "start" });
		stopWaiting = waitForScrollEnd(() => {
			if (cancelled) return;
			passes += 1;
			const delta = misalignment();
			const atBottom = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 1;
			if (Math.abs(delta) > 2 && passes < 4 && !(delta > 0 && atBottom)) {
				run();
				return;
			}
			cancel(true);
		});
	};
	run();

	return () => cancel(false);
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

export function scrollActiveItemIntoHorizontalContainer(
	container: HTMLElement,
	activeElement: HTMLElement,
	behavior: ScrollBehavior = "auto",
): void {
	const containerRect = container.getBoundingClientRect();
	const activeRect = activeElement.getBoundingClientRect();
	const targetLeft =
		container.scrollLeft +
		(activeRect.left - containerRect.left) -
		containerRect.width / 2 +
		activeRect.width / 2;

	container.scrollTo({
		left: Math.max(0, targetLeft),
		behavior,
	});
}

export function syncNavbarCategoryTab(
	navbarType: string,
	activeCategory: string | null,
	behavior: ScrollBehavior = "auto",
) {
	if (!activeCategory) return;
	if (navbarType === "icon-list" || navbarType === "floating-bottom") {
		const container = document.querySelector(".icon-list-categories") as HTMLElement | null;
		const activeElement = container?.querySelector(".icon-list-card.active") as HTMLElement | null;
		if (container && activeElement) {
			scrollActiveItemIntoHorizontalContainer(container, activeElement, behavior);
		}
	} else if (navbarType === "sidebar-categories") {
		const container = document.querySelector(".sidebar-categories-panel") as HTMLElement | null;
		const activeElement = container?.querySelector(".sidebar-nav-item.active") as HTMLElement | null;
		if (container && activeElement) {
			activeElement.scrollIntoView({ behavior, block: "nearest", inline: "nearest" });
		}
	}
}
