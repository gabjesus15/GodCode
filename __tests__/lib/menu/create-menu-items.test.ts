import { describe, expect, it, vi } from "vitest";

import { createMenuItems, deleteSampleItems, getMenuStatus } from "@/lib/menu/create-menu-items";
import { buildSampleMenu } from "@/lib/menu/sample-menus";

type Row = Record<string, unknown>;

/** Base en memoria: `adminClient` lee, `userClient` crea y borra como lo harían las RPC. */
function fakeDb(initial: { branches?: Row[]; categories?: Row[]; products?: Row[] }) {
	const db = {
		branches: initial.branches ?? [{ id: "b-main", is_active: true }],
		categories: [...(initial.categories ?? [])],
		products: [...(initial.products ?? [])],
	};
	let seq = 0;

	const adminClient = {
		from(table: keyof typeof db) {
			const query = {
				select: (_cols: string, opts?: { count?: string; head?: boolean }) => {
					if (opts?.head) return { eq: async () => ({ count: db[table].length, error: null }) };
					return query;
				},
				eq: () => query,
				order: () => query,
				limit: async () => ({ data: [...db[table]], error: null }),
				then: (resolve: (v: unknown) => void) => resolve({ data: [...db[table]], error: null }),
			};
			return query;
		},
	};

	const rpc = vi.fn(async (name: string, args: Row) => {
		if (name === "admin_create_category_with_overrides") {
			db.categories.push({ id: `c${++seq}`, name: args.p_name });
			return { data: null, error: null };
		}
		if (name === "admin_upsert_product_with_branch") {
			if (args.p_name === "Falla") return { data: null, error: { message: "no permitido" } };
			const id = `p${++seq}`;
			db.products.push({ id, name: args.p_name, description: args.p_description, category_id: args.p_category_id });
			return { data: id, error: null };
		}
		if (name === "admin_delete_product_with_branch") {
			db.products = db.products.filter((p) => p.id !== args.p_product_id);
			return { data: null, error: null };
		}
		return { data: null, error: { message: "rpc desconocida" } };
	});
	const deletedCategories: string[] = [];
	const userClient = {
		rpc,
		from: () => ({
			delete: () => ({
				eq: (_col: string, id: string) => ({
					eq: async () => {
						deletedCategories.push(id);
						db.categories = db.categories.filter((c) => c.id !== id);
						return { error: null };
					},
				}),
			}),
		}),
	};
	return { db, rpc, deletedCategories, clients: { adminClient: adminClient as never, userClient: userClient as never, companyId: "co-1" } };
}

describe("createMenuItems", () => {
	it("crea las categorías que faltan y los productos en todas las sucursales", async () => {
		const { rpc, clients, db } = fakeDb({ categories: [{ id: "c-existing", name: "Bebidas" }] });
		const result = await createMenuItems({
			...clients,
			draft: {
				categories: [
					{ name: "Pizzas", products: [{ name: "Margarita", description: "Tomate y queso", price: 8990 }] },
					{ name: "bebidas", products: [{ name: "Agua", description: "", price: 1000 }] },
				],
			},
		});
		expect(result).toMatchObject({ categoriesCreated: 1, productsCreated: 2, skipped: 0, errors: [] });
		expect(rpc).toHaveBeenCalledWith("admin_create_category_with_overrides", {
			p_name: "Pizzas",
			p_branch_id: "b-main",
			p_order: null,
			p_is_active: true,
		});
		expect(rpc).toHaveBeenCalledWith(
			"admin_upsert_product_with_branch",
			expect.objectContaining({ p_name: "Agua", p_category_id: "c-existing", p_price: "1000", p_description: null, p_apply_to_all_branches: true }),
		);
		expect(db.products).toHaveLength(2);
	});

	it("no repite productos que ya existen en esa categoría y anota los que fallan", async () => {
		const { clients } = fakeDb({
			categories: [{ id: "c1", name: "Pizzas" }],
			products: [{ id: "p0", name: "Margarita", description: "", category_id: "c1" }],
		});
		const result = await createMenuItems({
			...clients,
			draft: {
				categories: [
					{
						name: "Pizzas",
						products: [
							{ name: "MARGARITA", description: "", price: 1 },
							{ name: "Falla", description: "", price: 1 },
							{ name: "Napolitana", description: "", price: 1 },
						],
					},
				],
			},
		});
		expect(result.skipped).toBe(1);
		expect(result.productsCreated).toBe(1);
		expect(result.errors).toEqual(["«Falla»: no permitido"]);
	});

	it("usa la sucursal activa más antigua y avisa si no hay ninguna", async () => {
		const withInactive = fakeDb({ branches: [{ id: "b-old", is_active: false }, { id: "b-ok", is_active: true }] });
		await createMenuItems({ ...withInactive.clients, draft: { categories: [{ name: "X", products: [{ name: "Y", description: "", price: 1 }] }] } });
		expect(withInactive.rpc.mock.calls[0][1]).toMatchObject({ p_branch_id: "b-ok" });

		const none = fakeDb({ branches: [] });
		const result = await createMenuItems({ ...none.clients, draft: { categories: [] } });
		expect(result.errors[0]).toContain("no tiene sucursales");
		expect(none.rpc).not.toHaveBeenCalled();
	});
});

describe("deleteSampleItems", () => {
	it("borra solo los ejemplos sin cambios y las categorías de ejemplo que quedan vacías", async () => {
		const sample = buildSampleMenu("Pizzería", "USD");
		const [pizza, pepperoni] = sample.categories[0].products;
		const { clients, db, deletedCategories } = fakeDb({
			categories: [
				{ id: "c-pizzas", name: "Pizzas" },
				{ id: "c-bebidas", name: "Bebidas" },
				{ id: "c-mia", name: "Promos" },
			],
			products: [
				{ id: "p1", name: pizza.name, description: pizza.description, category_id: "c-pizzas" },
				{ id: "p2", name: pepperoni.name, description: "Mi receta", category_id: "c-pizzas" },
				{ id: "p3", name: "Agua mineral", description: "Ejemplo: 500 ml, con o sin gas.", category_id: "c-bebidas" },
			],
		});
		const result = await deleteSampleItems(clients);
		expect(result).toMatchObject({ productsDeleted: 2, categoriesDeleted: 1, errors: [] });
		expect(db.products.map((p) => p.id)).toEqual(["p2"]);
		// «Pizzas» aún tiene un producto editado y «Promos» no es de ejemplo.
		expect(deletedCategories).toEqual(["c-bebidas"]);
	});
});

describe("getMenuStatus", () => {
	it("cuenta productos, ejemplos y categorías", async () => {
		const { clients } = fakeDb({
			categories: [{ id: "c1", name: "Pizzas" }],
			products: [
				{ id: "p1", name: "Agua mineral", description: "Ejemplo: 500 ml, con o sin gas.", category_id: "c1" },
				{ id: "p2", name: "Mía", description: "", category_id: "c1" },
			],
		});
		expect(await getMenuStatus(clients.adminClient, "co-1")).toEqual({ productCount: 2, sampleCount: 1, categoryCount: 1 });
	});
});
