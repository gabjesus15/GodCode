import { DEFAULT_EXCHANGE_RATE_SOURCE } from "@/lib/exchange-rates/sources";

/**
 * Columnas de `branches` que agrega el SQL de octubre de 2026, que el dueño corre a mano:
 * - `binance_pay` (datos de Binance Pay)
 * - `exchange_rate_source` (fuente de la tasa BCV)
 *
 * La app puede desplegarse antes, y PostgREST rechaza entero un select o un update que nombra una
 * columna que no existe (42703 / PGRST204): eso dejó sin sucursales al menú, a Mi cuenta y al
 * súper admin. Quien las lee o escribe pasa esta lista a `selectWithOptionalColumns` o
 * `updateWithOptionalColumns` (lib/infra/db-compat.ts): sin la migración la sucursal se lee igual
 * (esas columnas en `null`) y se guarda todo lo demás.
 *
 * Cuando las dos migraciones estén en todas las bases, esta lista y los reintentos sobran.
 */
export const PENDING_BRANCH_COLUMNS = ["binance_pay", "exchange_rate_source"] as const;

export type PendingBranchColumn = (typeof PENDING_BRANCH_COLUMNS)[number];

/**
 * De las columnas que no se pudieron guardar, las que traían un cambio de verdad:
 * - `binance_pay`, si trae datos (vacía queda en `null`, igual que sin la columna).
 * - `exchange_rate_source`, si no es el dólar BCV. La migración se lo pone a todas las sucursales
 *   de Venezuela, y el modal de Mi cuenta lo manda por defecto en cada guardado: avisar por eso
 *   haría que el dueño viera un error cada vez que guarda una sucursal de Venezuela.
 */
export function unsavedBranchChanges(
	patch: Record<string, unknown>,
	droppedColumns: readonly string[],
): PendingBranchColumn[] {
	return PENDING_BRANCH_COLUMNS.filter((column) => {
		if (!droppedColumns.includes(column)) return false;
		const value = patch[column];
		if (value == null) return false;
		return column !== "exchange_rate_source" || value !== DEFAULT_EXCHANGE_RATE_SOURCE;
	});
}

/** Lo que se le dice a quien guardó: qué falta en la base, qué no se guardó y que el resto sí. */
export function pendingBranchMigrationMessage(columns: readonly PendingBranchColumn[]): string {
	const binance = columns.includes("binance_pay");
	const rates = columns.includes("exchange_rate_source");
	const [migration, effect] =
		binance && rates
			? ["las migraciones de Binance Pay y de tasas de cambio", "esos datos no se guardaron"]
			: binance
				? ["la migración de Binance Pay", "sus datos no se guardaron"]
				: ["la migración de tasas de cambio", "la tasa elegida no se guardó"];
	return `Falta aplicar ${migration} en la base, así que ${effect}. El resto de la sucursal sí se guardó.`;
}
