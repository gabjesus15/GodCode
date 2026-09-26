/**
 * Armado de consulta para `/api/geo/address-search` (cliente y servidor pueden importar).
 */

/**
 * Un solo campo de búsqueda: "calle número" o "calle número, comuna".
 * La comuna es el tramo tras la última coma si tiene longitud razonable.
 */
export function parseUnifiedAddressSearch(text: string): {
	line1: string;
	commune: string;
} {
	const t = text.trim();
	if (!t) return { line1: "", commune: "" };
	const lastComma = t.lastIndexOf(",");
	if (lastComma < 1 || lastComma >= t.length - 1) {
		return { line1: t, commune: "" };
	}
	const before = t.slice(0, lastComma).trim();
	const after = t.slice(lastComma + 1).trim();
	if (after.length >= 2 && after.length <= 100) {
		return { line1: before || t, commune: after };
	}
	return { line1: t, commune: "" };
}
