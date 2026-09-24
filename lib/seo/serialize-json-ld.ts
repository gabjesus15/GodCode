/**
 * Serializa datos estructurados para un `<script type="application/ld+json">`.
 *
 * `JSON.stringify` no escapa `</script>`: un nombre de tienda o de producto escrito por
 * el tenant cerraría la etiqueta y ejecutaría HTML propio en el menú público, que vive
 * en el mismo origen que los paneles. Se escapan `<`, `>` y `&` como secuencias de
 * escape Unicode (JSON válido, mismo valor al parsearlo) y también los separadores de
 * línea y de párrafo (U+2028/U+2029).
 */
const ESCAPES: Array<[RegExp, string]> = [
	[/</g, "\\u003c"],
	[/>/g, "\\u003e"],
	[/&/g, "\\u0026"],
	[new RegExp(String.fromCharCode(0x2028), "g"), "\\u2028"],
	[new RegExp(String.fromCharCode(0x2029), "g"), "\\u2029"],
];

export function serializeJsonLd(value: unknown): string {
	let out = JSON.stringify(value);
	for (const [pattern, replacement] of ESCAPES) {
		out = out.replace(pattern, replacement);
	}
	return out;
}
