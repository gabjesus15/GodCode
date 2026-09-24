/**
 * Ruta apta para analítica (Google Analytics y `analytics_events`).
 *
 * Varias URLs llevan credenciales: el `token` del onboarding da acceso a los datos de la
 * solicitud, `/onboarding/verify/<token>` lo lleva en la ruta y los enlaces de acceso
 * traen `token_hash`. Esas rutas terminaban en GA tal cual. Se quitan los parámetros
 * sensibles y los segmentos con pinta de identificador se reemplazan por un marcador.
 */
const SENSITIVE_QUERY_PARAMS = new Set([
	"token",
	"token_hash",
	"code",
	"ref",
	"email",
	"search",
	"access_token",
	"refresh_token",
	"payerid",
]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/**
 * Cadena larga con pinta de token (hash, id de orden, base64): tiene dígitos y además
 * mayúsculas o ningún guion. Un slug largo ("la-parada-de-maracaibo-2") no entra.
 */
function isOpaqueId(segment: string): boolean {
	if (segment.length < 24 || !/^[A-Za-z0-9_-]+$/.test(segment) || !/[0-9]/.test(segment)) return false;
	return /[A-Z]/.test(segment) || !segment.includes("-");
}

export function sanitizeAnalyticsPath(pathname: string, search?: string | URLSearchParams | null): string {
	const segments = pathname.split("/").map((segment, index, all) => {
		if (!segment) return segment;
		if (all[index - 1] === "verify" && all[index - 2] === "onboarding") return "[token]";
		if (UUID.test(segment) || isOpaqueId(segment)) return "[id]";
		return segment;
	});
	const cleanPath = segments.join("/") || "/";

	const params = new URLSearchParams(typeof search === "string" ? search.replace(/^\?/, "") : search ?? undefined);
	for (const key of [...params.keys()]) {
		if (SENSITIVE_QUERY_PARAMS.has(key.toLowerCase())) params.delete(key);
	}
	const qs = params.toString();
	return qs ? `${cleanPath}?${qs}` : cleanPath;
}
