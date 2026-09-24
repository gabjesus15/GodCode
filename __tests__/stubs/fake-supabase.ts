/**
 * Supabase en memoria para probar lógica que encadena consultas (`from().update().eq()…`).
 * Cubre solo lo que usan los módulos probados: select/insert/update/upsert/delete con
 * filtros eq / neq / in / not(is null) y maybeSingle / single. Las columnas del select se
 * ignoran (devuelve la fila completa). Opcional: columnas únicas por tabla (un insert
 * repetido devuelve 23505, como Postgres) y tablas que «no existen» (42P01), para probar
 * el código que depende de una migración.
 */

type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;
type FakeError = { code: string; message: string } | null;
type FakeResult = { data: unknown; error: FakeError };

export type FakeDb = Record<string, Row[]>;
export type FakeOptions = { unique?: Record<string, string[]>; missingTables?: string[] };

class FakeQuery implements PromiseLike<FakeResult> {
	private filters: Filter[] = [];
	private op: "select" | "update" | "insert" | "upsert" | "delete" = "select";
	private patch: Row | Row[] | null = null;
	private conflictKeys: string[] = [];
	private returning = false;
	private singleMode: "maybe" | "one" | null = null;
	private max: number | null = null;

	constructor(
		private readonly db: FakeDb,
		private readonly table: string,
		private readonly log: Array<{ table: string; op: string; patch: unknown }>,
		private readonly options: FakeOptions = {},
	) {}

	select() {
		// Tras update/insert/upsert, `select()` pide las filas afectadas.
		if (this.op !== "select") this.returning = true;
		return this;
	}
	update(patch: Row) {
		this.op = "update";
		this.patch = patch;
		return this;
	}
	insert(rows: Row | Row[]) {
		this.op = "insert";
		this.patch = rows;
		return this;
	}
	upsert(rows: Row | Row[], options?: { onConflict?: string }) {
		this.op = "upsert";
		this.patch = rows;
		this.conflictKeys = String(options?.onConflict ?? "id").split(",").map((key) => key.trim());
		return this;
	}
	delete() {
		this.op = "delete";
		return this;
	}
	eq(column: string, value: unknown) {
		this.filters.push((row) => row[column] === value);
		return this;
	}
	neq(column: string, value: unknown) {
		this.filters.push((row) => row[column] !== value);
		return this;
	}
	in(column: string, values: unknown[]) {
		this.filters.push((row) => values.includes(row[column]));
		return this;
	}
	not(column: string, operator: string, value: unknown) {
		if (operator === "is" && value === null) this.filters.push((row) => row[column] != null);
		return this;
	}
	order() {
		return this;
	}
	limit(count: number) {
		this.max = count;
		return this;
	}
	maybeSingle() {
		this.singleMode = "maybe";
		return this;
	}
	single() {
		this.singleMode = "one";
		return this;
	}

	private rows(): Row[] {
		this.db[this.table] ??= [];
		return this.db[this.table];
	}

	private execute(): FakeResult {
		if (this.options.missingTables?.includes(this.table)) {
			return { data: null, error: { code: "42P01", message: `relation "${this.table}" does not exist` } };
		}
		const rows = this.rows();
		const matched = rows.filter((row) => this.filters.every((filter) => filter(row)));
		let result: Row[] = matched;

		if (this.op === "update") {
			for (const row of matched) Object.assign(row, this.patch);
			this.log.push({ table: this.table, op: "update", patch: this.patch });
		} else if (this.op === "insert" || this.op === "upsert") {
			const incoming = (Array.isArray(this.patch) ? this.patch : [this.patch]) as Row[];
			const uniqueKeys = this.op === "insert" ? (this.options.unique?.[this.table] ?? []) : [];
			const clash = incoming.some((item) => uniqueKeys.some((key) => item[key] != null && rows.some((row) => row[key] === item[key])));
			if (clash) return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
			result = incoming.map((item) => {
				const existing =
					this.op === "upsert" ? rows.find((row) => this.conflictKeys.every((key) => row[key] === item[key])) : undefined;
				if (existing) return Object.assign(existing, item);
				const created = { id: `id-${rows.length + 1}`, ...item };
				rows.push(created);
				return created;
			});
			this.log.push({ table: this.table, op: this.op, patch: this.patch });
		} else if (this.op === "delete") {
			this.db[this.table] = rows.filter((row) => !matched.includes(row));
			this.log.push({ table: this.table, op: "delete", patch: null });
		}

		if (this.max != null) result = result.slice(0, this.max);
		const wantsRows = this.op === "select" || this.returning;
		if (!wantsRows) return { data: null, error: null };
		if (this.singleMode) return { data: result[0] ? { ...result[0] } : null, error: null };
		return { data: result.map((row) => ({ ...row })), error: null };
	}

	then<TResult1 = FakeResult, TResult2 = never>(
		onfulfilled?: ((value: FakeResult) => TResult1 | PromiseLike<TResult1>) | null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): PromiseLike<TResult1 | TResult2> {
		return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
	}
}

export function createFakeSupabase(db: FakeDb, options: FakeOptions = {}) {
	const log: Array<{ table: string; op: string; patch: unknown }> = [];
	const client = {
		from(table: string) {
			return new FakeQuery(db, table, log, options);
		},
	};
	return { client, db, log };
}
