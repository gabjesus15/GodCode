/** Fuentes de tráfico que cuentan como Instagram en el `utm_source` del enlace de la bio. */
const INSTAGRAM_SOURCES = new Set(["instagram", "ig"]);

/**
 * Dice si la visita llega desde Instagram: por el `utm_source` del enlace o por la
 * referencia que deja el navegador de la app (`l.instagram.com`). Sirve para enseñar
 * el camino a Gcode POS solo a quien llega buscándolo, sin tocar la home para el resto.
 */
export function isInstagramVisit({ search, referrer }: { search: string; referrer: string }): boolean {
	const source = new URLSearchParams(search).get("utm_source")?.trim().toLowerCase();
	if (source && INSTAGRAM_SOURCES.has(source)) return true;
	if (!referrer) return false;
	try {
		const host = new URL(referrer).hostname.toLowerCase();
		return host === "instagram.com" || host.endsWith(".instagram.com");
	} catch {
		return false;
	}
}
