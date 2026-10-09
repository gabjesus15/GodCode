"use client";

import { useLayoutEffect, type RefObject } from "react";

/**
 * Marca de la categoría activa que se desliza de una a otra en vez de
 * apagarse en una y encenderse en otra (pestañas subrayadas y barra lateral).
 * Solo mueve `transform`; la primera colocación va sin transición (el CSS la
 * activa con `[data-ready]`).
 *
 * - "x": línea bajo la pestaña, del ancho de su texto (descuenta el padding).
 * - "y": fondo detrás del elemento de la lista, de su mismo alto.
 */
export function useSlidingIndicator(
	containerRef: RefObject<HTMLElement | null>,
	indicatorRef: RefObject<HTMLElement | null>,
	activeSelector: string | null,
	axis: "x" | "y",
	deps: readonly unknown[],
) {
	useLayoutEffect(() => {
		const container = containerRef.current;
		const indicator = indicatorRef.current;
		if (!container || !indicator) return;

		const place = () => {
			const active = activeSelector ? container.querySelector<HTMLElement>(activeSelector) : null;
			if (!active) {
				indicator.style.opacity = "0";
				return;
			}
			if (axis === "x") {
				const inset = parseFloat(getComputedStyle(active).paddingLeft) || 0;
				const width = Math.max(active.offsetWidth - inset * 2, 8);
				indicator.style.transform = `translateX(${active.offsetLeft + inset}px) scaleX(${width})`;
			} else {
				indicator.style.height = `${active.offsetHeight}px`;
				indicator.style.transform = `translateY(${active.offsetTop}px)`;
			}
			indicator.style.opacity = "1";
			if (!indicator.dataset.ready) {
				requestAnimationFrame(() => {
					indicator.dataset.ready = "1";
				});
			}
		};

		place();
		const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
		observer?.observe(container);
		return () => observer?.disconnect();
		// eslint-disable-next-line react-hooks/exhaustive-deps -- deps los da quien llama
	}, [activeSelector, axis, ...deps]);
}
