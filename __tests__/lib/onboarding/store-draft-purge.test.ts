import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/onboarding/store-draft-service", () => ({
	openStoreDraft: vi.fn(async () => ({ opened: false, slug: null })),
	requestTenantRevalidation: vi.fn(async () => undefined),
}));

import { purgeStoreDraft, runStoreDraftJobs } from "@/lib/onboarding/store-draft-jobs";

type Op = { method: string; args: unknown[] };
type Result = { data?: unknown; error?: { message: string; code?: string } | null; count?: number };

const NOW = new Date("2026-11-15T12:00:00.000Z");
const COMPANY = {
	id: "c1",
	public_slug: "rica-pizza",
	subscription_status: "trial",
	theme_config: { storeDraft: { since: "2026-10-01T00:00:00.000Z" } },
};

/** Cliente falso: cada consulta termina en `respond(tabla, operaciones)`; Storage es un árbol en memoria. */
function fakeClient(respond: (table: string, ops: Op[]) => Result, tree: Record<string, Array<{ name: string; id: string | null }>> = {}) {
	const calls: Array<{ table: string; ops: Op[] }> = [];
	const removed: string[][] = [];
	const listed: string[] = [];
	const from = (table: string) => {
		const ops: Op[] = [];
		calls.push({ table, ops });
		const finish = () => Promise.resolve({ data: null, error: null, ...respond(table, ops) });
		const query: Record<string, unknown> = {};
		for (const method of ["select", "insert", "update", "delete", "eq", "in", "not", "is", "order", "limit"]) {
			query[method] = (...args: unknown[]) => {
				ops.push({ method, args });
				return query;
			};
		}
		query.maybeSingle = finish;
		query.single = finish;
		query.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => finish().then(resolve, reject);
		return query;
	};
	const storage = {
		from: (bucket: string) => ({
			list: async (prefix: string) => {
				listed.push(`${bucket}:${prefix}`);
				return { data: tree[prefix] ?? [], error: null };
			},
			remove: async (paths: string[]) => {
				removed.push(paths);
				return { data: null, error: null };
			},
		}),
	};
	const auth = { admin: { deleteUser: vi.fn(async () => ({ data: null, error: null })) } };
	return { client: { from, storage, auth } as never, calls, removed, listed, auth };
}

const has = (ops: Op[], method: string) => ops.some((op) => op.method === method);
const deletes = (calls: Array<{ table: string; ops: Op[] }>) => calls.filter((c) => has(c.ops, "delete")).map((c) => c.table);

/** Una tienda en vista previa de 45 días con dos productos, una categoría y su dueño. */
function draftStore(overrides: (table: string, ops: Op[]) => Result | undefined = () => undefined) {
	return (table: string, ops: Op[]): Result => {
		const custom = overrides(table, ops);
		if (custom) return custom;
		if (table === "companies" && has(ops, "select")) return { data: COMPANY };
		if (table === "users" && has(ops, "select") && ops.some((op) => op.method === "eq" && op.args[0] === "auth_user_id")) return { count: 0 };
		if (table === "users" && has(ops, "select")) return { data: [{ id: "u-row", auth_user_id: "auth-1" }] };
		if (table === "onboarding_applications" && has(ops, "select")) return { data: [{ id: "app-1", status: "email_verified" }] };
		if (table === "products" && has(ops, "select")) return { data: [{ id: "p1" }, { id: "p2" }] };
		if (table === "product_extras_groups" && has(ops, "select")) return { data: [{ id: "g1" }] };
		if (table === "categories" && has(ops, "select")) return { data: [{ id: "cat1" }] };
		return {};
	};
}

const TREE = {
	c1: [{ name: "storefront", id: null }],
	"c1/storefront": [{ name: "branding", id: null }],
	"c1/storefront/branding": [
		{ name: "logo", id: null },
		{ name: "home-cover", id: null },
	],
	"c1/storefront/branding/logo": [{ name: "a.png", id: "f1" }],
	"c1/storefront/branding/home-cover": [{ name: "b.jpg", id: "f2" }],
};

beforeEach(() => {
	vi.clearAllMocks();
});

describe("borrado de una tienda en vista previa a los 30 días", () => {
	it("borra el catálogo (hijos primero), la empresa, la cuenta y sus archivos del bucket menu", async () => {
		const { client, calls, removed, listed, auth } = fakeClient(draftStore(), TREE);

		const result = await purgeStoreDraft(client, "c1", NOW);

		expect(result).toEqual({ ok: true, warnings: [] });
		const order = deletes(calls);
		const before = (a: string, b: string) => expect(order.indexOf(a)).toBeLessThan(order.indexOf(b));
		before("product_extras_options", "product_extras_groups");
		before("product_prices", "products");
		before("product_branch", "products");
		before("product_upsell_beverages", "products");
		before("category_branch", "categories");
		before("products", "companies");
		before("categories", "companies");
		expect(order).toEqual(expect.arrayContaining(["product_sizes", "product_variants", "hero_banners", "company_theme_drafts", "company_theme_versions"]));
		expect(auth.admin.deleteUser).toHaveBeenCalledWith("auth-1");
		expect(listed[0]).toBe("menu:c1");
		expect(removed.flat().sort()).toEqual(["c1/storefront/branding/home-cover/b.jpg", "c1/storefront/branding/logo/a.png"]);
	});

	it("un paso del catálogo que falla queda anotado y el borrado sigue", async () => {
		const { client, calls } = fakeClient(
			draftStore((table, ops) => (table === "product_prices" && has(ops, "delete") ? { error: { message: "permission denied" } } : undefined)),
		);

		const result = await purgeStoreDraft(client, "c1", NOW);

		expect(result.ok).toBe(true);
		expect(result.warnings).toEqual(["precios: permission denied"]);
		expect(deletes(calls)).toContain("companies");
	});

	it("una tabla que todavía no existe no cuenta como error", async () => {
		const { client } = fakeClient(
			draftStore((table, ops) =>
				table === "product_variants" && has(ops, "delete") ? { error: { code: "PGRST205", message: "Could not find the table 'public.product_variants' in the schema cache" } } : undefined,
			),
		);
		expect(await purgeStoreDraft(client, "c1", NOW)).toEqual({ ok: true, warnings: [] });
	});

	it("si la empresa no se puede borrar, vuelve a atar la solicitud y no toca los archivos", async () => {
		const { client, calls, removed } = fakeClient(
			draftStore((table, ops) => (table === "companies" && has(ops, "delete") ? { error: { message: "violates foreign key constraint" } } : undefined)),
			TREE,
		);

		const result = await purgeStoreDraft(client, "c1", NOW);

		expect(result).toMatchObject({ ok: false, error: "empresa: violates foreign key constraint" });
		const restore = calls.filter((c) => c.table === "onboarding_applications" && has(c.ops, "update")).at(-1);
		expect(restore?.ops.find((op) => op.method === "update")?.args[0]).toEqual({ status: "email_verified", company_id: "c1" });
		expect(removed).toHaveLength(0);
	});

	it("una tienda que se pagó entre medio no se toca", async () => {
		const { client, calls } = fakeClient(
			draftStore((table, ops) => (table === "companies" && has(ops, "select") ? { data: { ...COMPANY, subscription_status: "active" } } : undefined)),
		);
		expect(await purgeStoreDraft(client, "c1", NOW)).toMatchObject({ ok: false });
		expect(deletes(calls)).toHaveLength(0);
	});

	it("el cron junta en el resumen lo que no se pudo limpiar sin cortar las demás", async () => {
		const respond = draftStore((table, ops) => {
			// Tiendas por abrir (heal): ninguna. Borradores pendientes: c1, con 45 días.
			if (table === "companies" && has(ops, "select") && ops.some((op) => op.method === "eq" && op.args[0] === "subscription_status" && op.args[1] === "active")) return { data: [] };
			if (table === "companies" && has(ops, "select") && ops.some((op) => op.method === "is" && op.args[0] === "subscription_ends_at")) {
				return { data: [{ id: "c1", public_slug: "rica-pizza", country: "CL", subscription_status: "trial", store_draft: COMPANY.theme_config.storeDraft }] };
			}
			if (table === "onboarding_applications" && has(ops, "select") && has(ops, "in")) return { data: [] };
			if (table === "hero_banners" && has(ops, "delete")) return { error: { message: "timeout" } };
			return undefined;
		});
		const { client } = fakeClient(respond, TREE);

		const summary = await runStoreDraftJobs({ supabaseAdmin: client, now: NOW, mode: "on" });

		expect(summary).toMatchObject({ purge_due: 1, purged: 1 });
		expect(summary.errors).toEqual(["rica-pizza: banners: timeout"]);
	});
});
