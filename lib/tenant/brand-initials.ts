/**
 * Iniciales de una marca para el monograma del menú (barra, portada, favicon, inicio y
 * página «abre pronto») y la inicial de un producto sin foto. Una sola regla para todos:
 *
 * - Cuentan las palabras «con peso»: se descartan artículos, preposiciones y conjunciones
 *   cortas en español, inglés y portugués («el», «la», «de», «del», «y», «the», «of», «da»…)
 *   y los signos sueltos («&», «-»). Si no queda ninguna palabra con peso («La La»), se usan todas.
 * - De cada una de las primeras `max` palabras va su primera letra o cifra, en mayúscula.
 * - Una sola palabra da una sola letra: «Gcode» → «G», no «GC».
 *
 * «Rica Pizza» → «RP», «La Pizza» → «P», «El Rincón del Sabor» → «RS», «Pizzería de Juan» → «PJ»,
 * «Fish & Chips» → «FC», «Da Vinci Pizza» → «VP» (el «Da» cae como preposición).
 * Con `max: 1`: «Pollo crispy» → «P». Sin nombre devuelve `fallback` (vacío por omisión).
 */

const STOP_WORDS = new Set([
	// es
	"el", "la", "los", "las", "un", "una", "unos", "unas", "de", "del", "al", "a", "y", "e", "o", "u", "en", "con", "por", "para", "lo",
	// en
	"the", "of", "and", "at", "in", "on", "to", "for", "by", "an",
	// pt
	"os", "as", "um", "uma", "do", "da", "dos", "das", "em", "com",
]);

/** Espacios y signos que no valen como inicial: puntuación ASCII, comillas, guiones largos, «»… */
const NOT_A_LETTER = /[\s!-/:-@[-`{-~¡¿«»“”‘’…·–—]/;

function firstLetter(word: string): string | undefined {
	return Array.from(word).find((char) => !NOT_A_LETTER.test(char));
}

export type BrandInitialsOptions = {
	/** Cuántas palabras aportan letra (2 por omisión; 1 para la inicial de un producto). */
	max?: number;
	/** Lo que se devuelve cuando el nombre está vacío o no tiene letras. */
	fallback?: string;
};

export function brandInitials(name: string | null | undefined, { max = 2, fallback = "" }: BrandInitialsOptions = {}): string {
	const words = String(name ?? "")
		.trim()
		.split(/\s+/)
		.filter((word) => firstLetter(word) !== undefined);
	if (words.length === 0) return fallback;

	const weighty = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));
	const chosen = (weighty.length > 0 ? weighty : words).slice(0, Math.max(1, max));
	const initials = chosen.map((word) => firstLetter(word)?.toUpperCase() ?? "").join("");
	return initials || fallback;
}
