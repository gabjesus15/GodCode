/**
 * Sección activa: la más reciente cuyo top ya pasó la línea del navbar.
 * `sections` (en orden del DOM) evita re-consultar el DOM en cada frame de scroll.
 */
export function resolveActiveSectionIdFromDom(
	anchorPx: number,
	sections?: ReadonlyArray<HTMLElement>,
): string | null {
	if (typeof document === "undefined") return null;

	const list = sections ?? Array.from(document.querySelectorAll<HTMLElement>(".category-section"));
	let activeId: string | null = null;

	for (const section of list) {
		// En orden: la primera que aún no llegó a la línea cierra la búsqueda.
		if (section.getBoundingClientRect().top > anchorPx + 8) break;
		const id = section.id.replace("section-", "");
		if (id) activeId = id;
	}

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
