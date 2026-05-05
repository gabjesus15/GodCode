/** Líneas de texto libres por plan (tarjeta admin + precios en landing). */

export const MAX_MARKETING_LINES = 24;
export const MAX_MARKETING_LINE_LENGTH = 500;

/**
 * Normaliza JSON/array desde BD o body API: solo strings no vacíos, recortados.
 */
export function normalizeMarketingLines(raw: unknown): string[] {
	if (raw === undefined || raw === null) return [];
	if (!Array.isArray(raw)) return [];
	const out: string[] = [];
	for (const item of raw) {
		if (out.length >= MAX_MARKETING_LINES) break;
		const s = typeof item === "string" ? item : String(item ?? "");
		const t = s.trim().slice(0, MAX_MARKETING_LINE_LENGTH);
		if (t.length > 0) out.push(t);
	}
	return out;
}
