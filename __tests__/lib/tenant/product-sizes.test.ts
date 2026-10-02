import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildCatalogOrderLines } from "@/components/tenant/cart/services/build-order-payload";
import { mergeCartWithBranchPrices } from "@/components/tenant/cart/utils/cart-pricing";
import { buildOrderItemsFromBranch } from "@/components/tenant/data/orders/build-order-items-from-branch";
import { composeSizedName, groupProductSizeRows, minSizePrice } from "@/lib/tenant/product-sizes";

const PIZZA = "11111111-1111-4111-8111-111111111111";
const FAMILIAR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PEQUENA = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const OTRO = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const BRANCH = "99999999-9999-4999-8999-999999999999";

describe("helpers de tamaños", () => {
	it("compone el nombre igual que la RPC", () => {
		expect(composeSizedName("Pizza", "Familiar")).toBe("Pizza (Familiar)");
		expect(composeSizedName("  ", "Familiar")).toBe("Familiar");
	});

	it("agrupa por producto en el orden del panel y descarta filas inválidas", () => {
		const grouped = groupProductSizeRows([
			{ id: FAMILIAR, product_id: PIZZA, name: "Familiar", price: "15000", sort_order: 1 },
			{ id: PEQUENA, product_id: PIZZA, name: "Pequeña", price: 8000, sort_order: 0 },
			{ id: OTRO, product_id: PIZZA, name: "Gratis", price: 0, sort_order: 2 },
			{ id: "", product_id: PIZZA, name: "Sin id", price: 10 },
		]);
		expect(grouped.get(PIZZA)).toEqual([
			{ id: PEQUENA, name: "Pequeña", price: 8000 },
			{ id: FAMILIAR, name: "Familiar", price: 15000 },
		]);
		expect(groupProductSizeRows(null).size).toBe(0);
	});

	it("el 'Desde' es el tamaño más barato", () => {
		expect(minSizePrice([{ id: "a", name: "A", price: 9 }, { id: "b", name: "B", price: 4 }])).toBe(4);
		expect(minSizePrice([])).toBeNull();
		expect(minSizePrice(undefined)).toBeNull();
	});
});

describe("mergeCartWithBranchPrices con tamaños", () => {
	const row = {
		product_id: PIZZA,
		price: 8000,
		has_discount: true,
		discount_price: 7000,
		products: { id: PIZZA, name: "Pizza Napolitana", is_active: true },
	};
	const sizedLine = {
		lineId: "l1",
		id: PIZZA,
		name: "Pizza (Familiar)",
		quantity: 1,
		price: 14000,
		size_id: FAMILIAR,
		size_name: "Familiar",
	};

	it("usa el precio vigente del tamaño, sin oferta, y recompone el nombre", () => {
		const [merged] = mergeCartWithBranchPrices(
			[sizedLine],
			[{ ...row, sizes: [{ id: FAMILIAR, name: "Familiar", price: 15000 }] }],
			{ omitLinesWithoutPriceWhenBranchHasData: true },
		);
		expect(merged).toMatchObject({
			price: 15000,
			has_discount: false,
			discount_price: null,
			name: "Pizza Napolitana (Familiar)",
		});
	});

	it("quita la línea si el tamaño ya no existe", () => {
		const merged = mergeCartWithBranchPrices([sizedLine], [{ ...row, sizes: [] }], {
			omitLinesWithoutPriceWhenBranchHasData: false,
		});
		expect(merged).toHaveLength(0);
	});

	it("conserva el precio del carrito si no se pudieron leer los tamaños", () => {
		const [merged] = mergeCartWithBranchPrices([sizedLine], [row], {
			omitLinesWithoutPriceWhenBranchHasData: false,
		});
		expect(merged?.price).toBe(14000);
	});

	it("una línea sin tamaño sigue con el precio base", () => {
		const [merged] = mergeCartWithBranchPrices(
			[{ lineId: "l2", id: PIZZA, quantity: 1, price: 1 }],
			[{ ...row, sizes: [{ id: FAMILIAR, name: "Familiar", price: 15000 }] }],
			{ omitLinesWithoutPriceWhenBranchHasData: false },
		);
		expect(merged?.price).toBe(8000);
	});
});

describe("buildCatalogOrderLines", () => {
	it("manda el size_id de la línea", () => {
		const [line] = buildCatalogOrderLines([
			{ id: PIZZA, lineId: "l1", name: "Pizza (Familiar)", quantity: 2, price: 15000, size_id: FAMILIAR },
		]);
		expect(line).toMatchObject({ id: PIZZA, price: 15000, size_id: FAMILIAR });
	});
});

/** Supabase falso: responde por tabla con las filas dadas, ignorando filtros salvo `in`. */
function fakeSupabase(tables: Record<string, Array<Record<string, unknown>>>) {
	return {
		from(table: string) {
			let rows = tables[table] ?? [];
			const query = {
				select: () => query,
				eq: () => query,
				in: (column: string, values: string[]) => {
					rows = rows.filter((r) => values.includes(String(r[column])));
					return query;
				},
				then: (resolve: (value: { data: unknown; error: null }) => void) =>
					resolve({ data: rows, error: null }),
			};
			return query;
		},
	} as unknown as SupabaseClient;
}

describe("buildOrderItemsFromBranch con tamaños", () => {
	const supabase = fakeSupabase({
		product_prices: [{ product_id: PIZZA, price: 8000, has_discount: true, discount_price: 7000 }],
		product_branch: [{ product_id: PIZZA }],
		products: [{ id: PIZZA, name: "Pizza" }],
		product_sizes: [
			{ id: FAMILIAR, product_id: PIZZA, name: "Familiar", price: 15000 },
			{ id: OTRO, product_id: OTRO, name: "Ajeno", price: 1 },
		],
	});

	it("toma el precio y el nombre del tamaño desde la base, no del cliente", async () => {
		const items = await buildOrderItemsFromBranch(supabase, BRANCH, [
			{ id: PIZZA, name: "x", quantity: 2, price: 1, size_id: FAMILIAR },
		]);
		expect(items).toEqual([
			expect.objectContaining({
				id: PIZZA,
				name: "Pizza (Familiar)",
				price: 15000,
				has_discount: false,
				discount_price: null,
				quantity: 2,
				size_id: FAMILIAR,
			}),
		]);
	});

	it("descarta un tamaño de otro producto", async () => {
		const items = await buildOrderItemsFromBranch(supabase, BRANCH, [
			{ id: PIZZA, name: "x", quantity: 1, price: 1, size_id: OTRO },
		]);
		expect(items).toEqual([]);
	});

	it("sin tamaño mantiene precio base y oferta", async () => {
		const [item] = await buildOrderItemsFromBranch(supabase, BRANCH, [
			{ id: PIZZA, name: "x", quantity: 1, price: 1 },
		]);
		expect(item).toMatchObject({ price: 8000, has_discount: true, discount_price: 7000 });
		expect(item).not.toHaveProperty("size_id");
	});
});
