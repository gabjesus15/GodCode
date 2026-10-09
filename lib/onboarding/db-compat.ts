/**
 * ¿El error de PostgREST es porque la columna todavía no existe en la base? Pasa cuando el
 * código llega a producción antes de que se corra la migración que la agrega (las corre el
 * dueño a mano): quien llama sigue sin esa columna en vez de romper el alta o el barrido.
 *
 * - 42703: columna inexistente en un select o un filtro.
 * - PGRST204: columna desconocida en un insert o update (caché de esquema de PostgREST).
 * Se exige además que el mensaje nombre la columna, para no tapar otros errores.
 */
export function isMissingColumnError(
	error: { code?: string | null; message?: string | null } | null | undefined,
	column: string,
): boolean {
	if (!error) return false;
	const message = String(error.message ?? "");
	if (!message.includes(column)) return false;
	return error.code === "42703" || error.code === "PGRST204" || /does not exist|could not find/i.test(message);
}
