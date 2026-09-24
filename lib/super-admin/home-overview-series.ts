/**
 * Cálculos puros del Inicio: tramos de tiempo para las líneas pequeñas de cada tarjeta.
 */

/** Fin de cada tramo (ms) entre `startMs` y `endMs`, repartidos en partes iguales. */
export function bucketEnds(startMs: number, endMs: number, count: number): number[] {
	const n = Math.max(1, Math.floor(count));
	const span = Math.max(1, endMs - startMs);
	return Array.from({ length: n }, (_, i) => startMs + (span * (i + 1)) / n);
}

function toMs(value: string | null | undefined): number | null {
	if (!value) return null;
	const ms = new Date(value).getTime();
	return Number.isFinite(ms) ? ms : null;
}

/** Cuántos eventos cayeron dentro de cada tramo. */
export function countPerBucket(dates: Array<string | null | undefined>, startMs: number, ends: number[]): number[] {
	const out = ends.map(() => 0);
	for (const d of dates) {
		const ms = toMs(d);
		if (ms == null || ms <= startMs || ms > ends[ends.length - 1]) continue;
		const idx = ends.findIndex((end) => ms <= end);
		if (idx >= 0) out[idx] += 1;
	}
	return out;
}

/** Total acumulado al cierre de cada tramo (incluye lo anterior al inicio). */
export function cumulativeAt(dates: Array<string | null | undefined>, ends: number[]): number[] {
	const ms = dates.map(toMs).filter((v): v is number => v != null);
	return ends.map((end) => ms.filter((v) => v <= end).length);
}

/** Cuántas fechas caen desde `fromMs` (inclusive) hasta ahora. */
export function countSince(dates: Array<string | null | undefined>, fromMs: number | null): number {
	return dates.reduce((acc, d) => {
		const ms = toMs(d);
		return ms != null && (fromMs == null || ms >= fromMs) ? acc + 1 : acc;
	}, 0);
}
