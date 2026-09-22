/**
 * `deliveryLine1` se guarda como "calle número"; el formulario lo edita en dos
 * campos. Estas funciones son el único puente entre ambas formas.
 */
export function splitStreetAndNumber(line1: string): { street: string; number: string } {
	const text = line1.trim();
	if (!text) return { street: "", number: "" };
	// "Av. Italia 1432, depto 4" → nos quedamos con lo anterior a la coma.
	const beforeComma = text.split(",")[0].trim();
	const match = beforeComma.match(/^(.*?)(\d+[A-Za-z]?)\s*$/);
	if (!match) return { street: text, number: "" };
	return { street: (match[1] ?? "").trim(), number: (match[2] ?? "").trim() };
}

export function joinStreetAndNumber(street: string, number: string): string {
	return [street.trim(), number.trim()].filter(Boolean).join(" ");
}

/** "Calle 123, Zona" sin coma colgante cuando falta una de las partes. */
export function joinAddressLine(line1: string, area: string): string {
	return [line1.trim(), area.trim()].filter(Boolean).join(", ");
}
