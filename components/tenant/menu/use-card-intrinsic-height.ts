"use client";

import { useEffect } from "react";

const CARD_SELECTOR = ".product-card";
const HEIGHT_VAR = "--menu-card-intrinsic-h";

/**
 * Las tarjetas llevan content-visibility: auto, así que las que están fuera de
 * pantalla miden lo que diga contain-intrinsic-size. Con un número fijo (280px)
 * la estimación fallaba según el ancho del teléfono y, al tocar una categoría
 * lejana, la página se pasaba cientos de px y tenía que volver. Aquí se mide
 * una tarjeta ya pintada y su alto pasa a ser la estimación de las demás.
 */
export function useCardIntrinsicHeight(deps: unknown) {
	useEffect(() => {
		if (typeof ResizeObserver === "undefined") return;
		const cards = Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR));
		// Una tarjeta pintada: si está omitida por content-visibility su alto es la
		// propia estimación y no sirve de medida.
		const sample = cards.find((card) =>
			typeof card.checkVisibility === "function"
				? card.checkVisibility({ contentVisibilityAuto: true })
				: true,
		);
		const scope = sample?.closest("main") ?? null;
		if (!sample || !scope) return;

		let last = 0;
		const observer = new ResizeObserver(([entry]) => {
			const height = Math.round(entry.contentRect.height);
			if (height <= 0 || height === last) return;
			last = height;
			scope.style.setProperty(HEIGHT_VAR, `${height}px`);
		});
		observer.observe(sample);
		return () => observer.disconnect();
	}, [deps]);
}
