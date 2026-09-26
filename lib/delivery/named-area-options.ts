import type { DeliveryNamedArea } from "./delivery-settings";

/**
 * Cómo se muestran las zonas de reparto en el selector del carrito.
 *
 * Las zonas creadas desde el mapa del panel llegan como «Lomas de Lo Aguirre ·
 * Región Metropolitana de Santiago»: la región se repite en casi todas y no
 * ayuda a elegir. Se separa el nombre de su contexto, el contexto que comparte
 * la mayoría se omite, y la lista va en orden alfabético con búsqueda sin tildes.
 * Los nombres escritos todo en mayúsculas o todo en minúsculas se pasan a
 * mayúscula inicial por palabra; los que ya traen mayúsculas mezcladas se respetan.
 */

export type NamedAreaOption = {
	id: string;
	/** Nombre para mostrar (primera letra en mayúscula). */
	title: string;
	/** Contexto (barrio, comuna…) cuando aporta; null si es el mismo de casi todas. */
	subtitle: string | null;
	fee: number;
	/** Texto normalizado para buscar: nombre, contexto y alias. */
	searchText: string;
};

const SEPARATOR = /\s+[·•|]\s+/;

/** Minúsculas, sin tildes ni signos, para comparar lo que escribe el cliente. */
export function normalizeSearchText(value: string): string {
	return value
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, " ")
		.trim();
}

/** Artículos y preposiciones que van en minúscula dentro de un nombre. */
const MINOR_WORDS = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "o", "en", "a", "al", "con", "por", "desde", "hasta", "entre"]);

function upperFirst(word: string): string {
	return word ? word[0].toLocaleUpperCase("es") + word.slice(1) : word;
}

/** «AV DEL CANAL» y «los carmonales» → «Av del Canal», «Los Carmonales». */
function tidyName(value: string): string {
	const trimmed = value.trim().replace(/\s+/g, " ");
	const hasLetters = /\p{L}/u.test(trimmed);
	const uniformCase = trimmed === trimmed.toLocaleUpperCase("es") || trimmed === trimmed.toLocaleLowerCase("es");
	if (!hasLetters || !uniformCase) return upperFirst(trimmed);
	return trimmed
		.toLocaleLowerCase("es")
		.split(" ")
		.map((word, index) => (index > 0 && MINOR_WORDS.has(word) ? word : upperFirst(word)))
		.join(" ");
}

/** Nombre corto y ordenado de una zona («LOMAS DE LO AGUIRRE · Región…» → «Lomas de Lo Aguirre»). */
export function namedAreaDisplayName(name: string): string {
	const [head] = String(name ?? "").split(SEPARATOR);
	return tidyName(head ?? "") || name;
}

export function buildNamedAreaOptions(areas: DeliveryNamedArea[]): NamedAreaOption[] {
	const parsed = areas.map((area) => {
		const [head, ...rest] = String(area.name ?? "").split(SEPARATOR);
		const subtitle = rest.map(tidyName).join(" · ");
		return { area, title: tidyName(head ?? ""), subtitle: subtitle || null };
	});

	// Un contexto es ruido si lo comparte al menos la mitad de las zonas, o si es
	// el único que aparece (todas las que lo traen dicen lo mismo): no distingue.
	const counts = new Map<string, number>();
	for (const entry of parsed) {
		if (entry.subtitle) counts.set(entry.subtitle, (counts.get(entry.subtitle) ?? 0) + 1);
	}
	let common: string | null = null;
	for (const [subtitle, count] of counts) {
		const noise = count >= 2 && (counts.size === 1 || count >= parsed.length / 2);
		if (noise && count > (common ? counts.get(common) ?? 0 : 0)) common = subtitle;
	}

	const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });
	return parsed
		.map(({ area, title, subtitle }) => ({
			id: area.id,
			title: title || area.name,
			subtitle: subtitle && subtitle !== common ? subtitle : null,
			fee: area.feeFlat,
			searchText: normalizeSearchText([area.name, ...(area.aliases ?? [])].join(" ")),
		}))
		.sort((a, b) => collator.compare(a.title, b.title));
}

/**
 * Cada palabra buscada tiene que empezar alguna palabra de la zona (en cualquier
 * orden): «lo» encuentra «Lomas» y «Lo Aguirre», no «Flores».
 */
export function filterNamedAreaOptions(options: NamedAreaOption[], query: string): NamedAreaOption[] {
	const words = normalizeSearchText(query).split(" ").filter(Boolean);
	if (words.length === 0) return options;
	return options.filter((option) => {
		const optionWords = option.searchText.split(" ");
		return words.every((word) => optionWords.some((candidate) => candidate.startsWith(word)));
	});
}
