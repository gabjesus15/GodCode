/**
 * Convivir con una base a la que todavía le falta una migración.
 *
 * Las migraciones las corre el dueño a mano y el código puede llegar a producción antes. PostgREST
 * no devuelve «lo que haya»: un select o un update que nombra una columna que no existe falla
 * entero. Estas funciones reconocen ese error puntual y repiten la consulta sin esa columna. Nunca
 * tapan otro error (red, permisos, timeout): ese vuelve tal cual, porque convertirlo en «sin filas»
 * es lo que dejó sin sucursales al menú.
 *
 * Sin dependencias a propósito: la usan la app, el servicio de alta y los tests.
 */

type DbError = { code: string; message: string };

function readDbError(error: unknown): DbError | null {
	if (!error || typeof error !== "object") return null;
	const { code, message } = error as { code?: unknown; message?: unknown };
	return { code: typeof code === "string" ? code : "", message: typeof message === "string" ? message : "" };
}

/** ¿`text` nombra el identificador completo? `exchange_rate_source` no cuenta dentro de `quoted_exchange_rate_source`. */
function namesIdentifier(text: string, identifier: string): boolean {
	const escaped = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`).test(text);
}

/**
 * ¿El error de PostgREST es porque la columna todavía no existe en la base? Quien llama sigue
 * sin esa columna en vez de romper.
 *
 * - 42703: columna inexistente en un select o un filtro.
 * - PGRST204: columna desconocida en un insert o update (caché de esquema de PostgREST).
 * Se exige además que el mensaje nombre la columna, para no tapar otros errores.
 */
export function isMissingColumnError(error: unknown, column: string): boolean {
	const parsed = readDbError(error);
	if (!parsed || !namesIdentifier(parsed.message, column)) return false;
	return parsed.code === "42703" || parsed.code === "PGRST204" || /does not exist|could not find/i.test(parsed.message);
}

/**
 * ¿El error es porque la tabla todavía no existe? 42P01 de Postgres o PGRST205 de PostgREST 12+
 * («Could not find the table … in the schema cache»). Con código manda el código: un 42703 de una
 * columna de esa misma tabla también dice «does not exist» y no es este caso.
 */
export function isMissingRelationError(error: unknown, relation: string): boolean {
	const parsed = readDbError(error);
	if (!parsed || !namesIdentifier(parsed.message, relation)) return false;
	if (parsed.code) return parsed.code === "42P01" || parsed.code === "PGRST205";
	return /does not exist|could not find the table/i.test(parsed.message);
}

/** Quita columnas de una lista plana de select («a,b,c»). No sirve para recursos anidados. */
export function omitSelectColumns(select: string, columns: readonly string[]): string {
	if (columns.length === 0) return select;
	return select
		.split(",")
		.filter((column) => !columns.includes(column.trim()))
		.join(",");
}

/** Las filas con esas columnas en `null`: la misma forma que tendrían con la migración aplicada. */
function withNullColumns(data: unknown, columns: readonly string[]): unknown {
	if (columns.length === 0 || data == null) return data;
	const nulls = Object.fromEntries(columns.map((column) => [column, null]));
	const fill = (row: unknown) => (row && typeof row === "object" ? { ...(row as Record<string, unknown>), ...nulls } : row);
	return Array.isArray(data) ? data.map(fill) : fill(data);
}

/**
 * Corre `run(select)` y, si falla porque alguna columna de `optional` todavía no existe, lo repite
 * sin ella (una vez por columna que falte). Las filas vuelven con esas columnas en `null`, así que
 * el tipo que PostgREST deduce del select completo sigue siendo cierto. Cualquier otro error vuelve
 * tal cual y sin reintentos.
 *
 * `missingColumns` dice cuáles faltaban, para no mandarlas después en un update.
 */
export async function selectWithOptionalColumns<Select extends string, Result extends { data: unknown; error: unknown }>(
	select: Select,
	optional: readonly string[],
	run: (select: Select) => PromiseLike<Result>,
): Promise<Result & { missingColumns: string[] }> {
	const missingColumns: string[] = [];
	for (;;) {
		const columns = omitSelectColumns(select, missingColumns) as Select;
		const result = await run(columns);
		const listed = columns.split(",").map((column) => column.trim());
		const absent = result.error
			? optional.find((column) => listed.includes(column) && isMissingColumnError(result.error, column))
			: undefined;
		if (!absent) {
			return { ...result, data: withNullColumns(result.data, missingColumns), missingColumns } as Result & {
				missingColumns: string[];
			};
		}
		missingColumns.push(absent);
	}
}

function omitKeys<T extends Record<string, unknown>>(record: T, keys: readonly string[]): Partial<T> {
	if (keys.length === 0) return record;
	return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key))) as Partial<T>;
}

/**
 * Corre `run(patch)` sin las columnas de `optional` que ya se sabe que faltan (`knownMissing`, lo
 * que devolvió el select) y, si falla porque falta otra, lo repite sin ella: el resto del cambio se
 * guarda igual. Pasa, por ejemplo, si PostgREST todavía no recargó su caché de esquema tras la
 * migración. `droppedColumns` dice qué columnas del `patch` no se guardaron, para que quien llama
 * avise si eso era justo lo que se quería cambiar.
 */
export async function updateWithOptionalColumns<Patch extends Record<string, unknown>, Result extends { error: unknown }>(
	patch: Patch,
	optional: readonly string[],
	run: (patch: Partial<Patch>) => PromiseLike<Result>,
	knownMissing: readonly string[] = [],
): Promise<Result & { droppedColumns: string[] }> {
	const droppedColumns = optional.filter((column) => knownMissing.includes(column) && column in patch);
	for (;;) {
		const current = omitKeys(patch, droppedColumns);
		const result = await run(current);
		const absent = result.error
			? optional.find((column) => column in current && isMissingColumnError(result.error, column))
			: undefined;
		if (!absent) return { ...result, droppedColumns };
		droppedColumns.push(absent);
	}
}
