import { vi } from "vitest";

/**
 * Mock encadenable mínimo del cliente PostgREST.
 *
 * Cada método devuelve el mismo objeto, y el objeto es "thenable", así que sirve
 * tanto para `await from(x).select().eq().maybeSingle()` como para cadenas que se
 * esperan sin terminal (`await from(x).update({}).eq()`).
 */
const CHAIN_METHODS = [
	"select",
	"insert",
	"update",
	"delete",
	"upsert",
	"eq",
	"neq",
	"not",
	"is",
	"in",
	"limit",
	"order",
	"maybeSingle",
	"single",
] as const;

export type TableQueues = Record<string, unknown[]>;

function makeChain(result: unknown) {
	const chain = {} as Record<string, unknown>;
	for (const method of CHAIN_METHODS) {
		chain[method] = vi.fn(() => chain);
	}
	chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
	return chain;
}

/**
 * Construye un `supabaseAdmin` falso. `tables` es una cola de resultados por tabla:
 * cada `from(tabla)` consume el siguiente; cuando se agota, repite el último.
 */
export function makeAdminMock(options: {
	tables: TableQueues;
	listUsers?: unknown;
	authAdmin?: Record<string, unknown>;
}) {
	const queues: TableQueues = Object.fromEntries(
		Object.entries(options.tables).map(([table, results]) => [table, [...results]]),
	);
	const lastByTable: Record<string, unknown> = {};
	const fromCalls: string[] = [];
	/** Cadenas creadas, para poder inspeccionar con qué se llamó cada método. */
	const chains: Array<{ table: string; chain: Record<string, unknown> }> = [];

	const from = vi.fn((table: string) => {
		fromCalls.push(table);
		const queue = queues[table];
		if (!queue) throw new Error(`tabla inesperada en el mock: ${table}`);
		const next = queue.length > 0 ? queue.shift() : lastByTable[table];
		lastByTable[table] = next;
		const chain = makeChain(next ?? { data: null, error: null });
		chains.push({ table, chain });
		return chain;
	});

	return {
		from,
		fromCalls,
		chains,
		auth: {
			admin: {
				listUsers: vi.fn(async () => options.listUsers ?? { data: { users: [] }, error: null }),
				...(options.authAdmin ?? {}),
			},
		},
	};
}

export const emptyResult = { data: null, error: null };
