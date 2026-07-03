/** Sección activa: la más reciente cuyo top ya pasó la línea del navbar. */
export function resolveActiveSectionIdFromDom(anchorPx: number): string | null {
	if (typeof document === "undefined") return null;

	let activeId: string | null = null;
	let bestTop = -Infinity;

	document.querySelectorAll<HTMLElement>(".category-section").forEach((section) => {
		const top = section.getBoundingClientRect().top;
		if (top <= anchorPx + 8 && top > bestTop) {
			bestTop = top;
			const id = section.id.replace("section-", "");
			if (id) activeId = id;
		}
	});

	return activeId;
}

/** Fallback virtual: último índice cuyo start <= línea de lectura. */
export function resolveActiveSectionIndexFromMeasurements(
	measurements: ReadonlyArray<{ start: number }>,
	readingLine: number,
): number {
	if (measurements.length === 0) return 0;

	let activeIndex = 0;
	for (let i = 0; i < measurements.length; i++) {
		if (measurements[i].start <= readingLine + 8) {
			activeIndex = i;
		} else {
			break;
		}
	}
	return activeIndex;
}
