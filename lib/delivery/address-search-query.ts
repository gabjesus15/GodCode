/**
 * Armado de consulta para `/api/geo/address-search` (cliente y servidor pueden importar).
 */

/**
 * Si el segundo campo está vacío pero en calle hay "…, Comuna", separa para armar bien la consulta al geocoder.
 */
export function splitStreetAndCommuneFromFields(
	line1: string,
	communeField: string,
): { street: string; communeHint: string } {
	const cf = communeField.trim();
	const raw = line1.trim();
	if (cf.length >= 2) {
		return { street: raw, communeHint: cf };
	}
	const idx = raw.lastIndexOf(",");
	if (idx > 0 && idx < raw.length - 1) {
		const streetPart = raw.slice(0, idx).trim();
		const communePart = raw.slice(idx + 1).trim();
		if (streetPart.length >= 2 && communePart.length >= 2) {
			return { street: streetPart, communeHint: communePart };
		}
	}
	return { street: raw, communeHint: "" };
}

export function buildAddressSearchQuery(street: string, communeHint: string): string {
	return [street, communeHint].filter(Boolean).join(", ").trim();
}

/**
 * Para `/api/geo/address-search`: si la calle tiene texto suficiente, no mezclar la comuna en `q`
 * (texto erróneo en comuna no debe desviar Mapbox). `communeHint` sigue yendo aparte para rankear.
 */
export function addressSearchQueryParam(street: string, communeHint: string): string {
	const s = street.trim();
	if (s.length >= 3) return s;
	return buildAddressSearchQuery(street, communeHint).trim();
}

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
