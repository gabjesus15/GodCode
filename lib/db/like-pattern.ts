/**
 * Escape de metacaracteres para patrones `LIKE` / `ILIKE` de PostgREST.
 *
 * Se usa cuando un valor que escribe el usuario se interpola dentro de un patrón
 * de búsqueda (`%${valor}%`). Sin escapar, ese valor puede cambiar el patrón:
 * `_` matchea cualquier carácter y `%` matchea cualquier cadena, así que un `q`
 * de `_` devuelve la tabla entera en vez de las filas que contienen un guion bajo.
 *
 * No usar para buscar identidad (un usuario por su email): para eso va `.eq()`,
 * no un patrón.
 */

/**
 * Neutraliza los metacaracteres de patrón de un valor antes de interpolarlo.
 *
 * - `\`, `%` y `_` se escapan con barra invertida, que es el carácter de escape
 *   por defecto de `LIKE` en Postgres (no hace falta cláusula `ESCAPE`).
 * - `*` se **elimina**. PostgREST lo acepta como alias de `%` y lo sustituye en el
 *   servidor, antes de que Postgres vea el patrón, así que escaparlo no sirve:
 *   `\*` llegaría como `\%`, que es un `%` literal y no un asterisco literal.
 *   Como `*` no es válido en un email ni aporta a una búsqueda, se descarta.
 *
 * El orden importa: la barra invertida se escapa primero, o se volverían a escapar
 * las que introducen los pasos siguientes.
 */
export function escapeLikePattern(value: string): string {
	return value
		.replace(/\\/g, "\\\\")
		.replace(/%/g, "\\%")
		.replace(/_/g, "\\_")
		.replace(/\*/g, "");
}
