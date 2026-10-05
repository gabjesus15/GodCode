import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { buildCatalogOrderLines } from "@/components/tenant/cart/services/build-order-payload";
import { mergeCartWithBranchPrices } from "@/components/tenant/cart/utils/cart-pricing";
import { buildOrderItemsFromBranch } from "@/components/tenant/data/orders/build-order-items-from-branch";
import { composeLineName } from "@/lib/tenant/product-sizes";
import {
	defaultVariantSelection,
	groupProductVariantRows,
	productNeedsConfiguration,
	resolveVariantSelection,
} from "@/lib/tenant/product-variants";

const BURGER = "11111111-1111-4111-8111-111111111111";
const CARNE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const POLLO = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MIXTA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MEDIO = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const FAMILIAR = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const AJENA = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const BRANCH = "99999999-9999-4999-8999-999999999999";

const rows = [
	{ id: POLLO, product_id: BURGER, group_name: "Proteína", name: "Pollo", price_delta: 0, image_url: "x/pollo.png", sort_order: 1 },
	{ id: CARNE, product_id: BURGER, group_name: "Proteína", name: "Carne", price_delta: "0", sort_order: 0 },
	{ id: MIXTA, product_id: BURGER, group_name: "proteína", name: "Mixta", price_delta: 1.5, sort_order: 2 },
	{ id: MEDIO, product_id: BURGER, group_name: "Punto", name: "Término medio", price_delta: 0, sort_order: 3 },
	{ id: "", product_id: BURGER, group_name: "Punto", name: "Sin id", price_delta: 0, sort_order: 4 },
];

describe("helpers de variantes", () => {
	it("agrupa por producto y por grupo (sin distinguir mayúsculas), en el orden del panel", () => {
		const groups = groupProductVariantRows(rows, (value) => `https://cdn/${value}`);
		expect(groups.get(BURGER)).toEqual([
			{
				name: "Proteína",
				options: [
					{ id: CARNE, name: "Carne", priceDelta: 0, imageUrl: null },
					{ id: POLLO, name: "Pollo", priceDelta: 0, imageUrl: "https://cdn/x/pollo.png" },
					{ id: MIXTA, name: "Mixta", priceDelta: 1.5, imageUrl: null },
				],
			},
			{ name: "Punto", options: [{ id: MEDIO, name: "Término medio", priceDelta: 0, imageUrl: null }] },
		]);
		expect(groupProductVariantRows(null).size).toBe(0);
	});

	it("la predeterminada es la primera de cada grupo y una selección válida suma los deltas", () => {
		const groups = groupProductVariantRows(rows).get(BURGER)!;
		expect(defaultVariantSelection(groups)).toEqual([CARNE, MEDIO]);
		expect(resolveVariantSelection(groups, [MIXTA, MEDIO])).toEqual({
			ids: [MIXTA, MEDIO],
			names: ["Mixta", "Término medio"],
			delta: 1.5,
		});
		// Dos del mismo grupo o una que ya no existe: la selección no vale.
		expect(resolveVariantSelection(groups, [CARNE, POLLO])).toBeNull();
		expect(resolveVariantSelection(groups, [AJENA])).toBeNull();
	});

	it("nombra la línea con tamaño y variantes como la RPC", () => {
		expect(composeLineName("Pizza", ["Familiar", "Pollo"])).toBe("Pizza (Familiar, Pollo)");
		expect(composeLineName("Pizza", [null, "Pollo"])).toBe("Pizza (Pollo)");
		expect(composeLineName("Pizza", [])).toBe("Pizza");
	});

	it("un producto con tamaños o variantes se configura en la hoja; uno simple se agrega directo", () => {
		expect(productNeedsConfiguration({ sizes: [{ id: FAMILIAR }] })).toBe(true);
		expect(productNeedsConfiguration({ variants: [{ name: "Proteína", options: [{ id: CARNE, name: "Carne", priceDelta: 0, imageUrl: null }] }] })).toBe(true);
		expect(productNeedsConfiguration({ variants: [{ name: "Vacío", options: [] }] })).toBe(false);
		expect(productNeedsConfiguration({})).toBe(false);
	});
});

describe("mergeCartWithBranchPrices con variantes", () => {
	const groups = groupProductVariantRows(rows).get(BURGER)!;
	const row = {
		product_id: BURGER,
		price: 11,
		has_discount: true,
		discount_price: 9,
		products: { id: BURGER, name: "Hamburguesa Americana", is_active: true },
		variants: groups,
	};
	const line = {
		lineId: "l1",
		id: BURGER,
		name: "Hamburguesa (Pollo)",
		quantity: 1,
		price: 100,
		has_discount: false,
		discount_price: null,
		variant_ids: [MIXTA, MEDIO],
		variant_names: ["Mixta", "Término medio"],
		variant_delta: 0,
	};

	it("recalcula precio y oferta con los deltas vigentes y recompone el nombre", () => {
		const [merged] = mergeCartWithBranchPrices([line], [row], { omitLinesWithoutPriceWhenBranchHasData: true });
		expect(merged).toMatchObject({
			price: 12.5,
			has_discount: true,
			discount_price: 10.5,
			variant_ids: [MIXTA, MEDIO],
			variant_names: ["Mixta", "Término medio"],
			variant_delta: 1.5,
			name: "Hamburguesa Americana (Mixta, Término medio)",
		});
	});

	it("con tamaño y variantes: precio del tamaño más deltas, sin oferta", () => {
		const [merged] = mergeCartWithBranchPrices(
			[{ ...line, size_id: FAMILIAR, size_name: "Familiar" }],
			[{ ...row, sizes: [{ id: FAMILIAR, name: "Familiar", price: 18 }] }],
			{ omitLinesWithoutPriceWhenBranchHasData: true },
		);
		expect(merged).toMatchObject({
			price: 19.5,
			has_discount: false,
			discount_price: null,
			name: "Hamburguesa Americana (Familiar, Mixta, Término medio)",
		});
	});

	it("quita la línea si una variante ya no existe y la conserva si no se pudieron leer", () => {
		expect(
			mergeCartWithBranchPrices([{ ...line, variant_ids: [AJENA] }], [row], { omitLinesWithoutPriceWhenBranchHasData: false }),
		).toHaveLength(0);
		const [kept] = mergeCartWithBranchPrices([line], [{ ...row, variants: undefined }], {
			omitLinesWithoutPriceWhenBranchHasData: false,
		});
		expect(kept?.price).toBe(100);
	});
});

describe("buildCatalogOrderLines", () => {
	it("manda los variant_ids de la línea", () => {
		const [out] = buildCatalogOrderLines([
			{ id: BURGER, lineId: "l1", name: "Hamburguesa (Mixta)", quantity: 1, price: 12.5, variant_ids: [MIXTA] },
		]);
		expect(out).toMatchObject({ id: BURGER, price: 12.5, variant_ids: [MIXTA] });
	});
});

/** Supabase falso: responde por tabla con las filas dadas, ignorando filtros salvo `in`. */
function fakeSupabase(tables: Record<string, Array<Record<string, unknown>>>) {
	return {
		from(table: string) {
			let data = tables[table] ?? [];
			const query = {
				select: () => query,
				eq: () => query,
				in: (column: string, values: string[]) => {
					data = data.filter((r) => values.includes(String(r[column])));
					return query;
				},
				then: (resolve: (value: { data: unknown; error: null }) => void) => resolve({ data, error: null }),
			};
			return query;
		},
	} as unknown as SupabaseClient;
}

describe("buildOrderItemsFromBranch con variantes", () => {
	const supabase = fakeSupabase({
		product_prices: [{ product_id: BURGER, price: 11, has_discount: true, discount_price: 9 }],
		product_branch: [{ product_id: BURGER }],
		products: [{ id: BURGER, name: "Hamburguesa Americana" }],
		product_sizes: [{ id: FAMILIAR, product_id: BURGER, name: "Familiar", price: 18 }],
		product_variants: [
			{ id: CARNE, product_id: BURGER, group_name: "Proteína", name: "Carne", price_delta: 0 },
			{ id: MIXTA, product_id: BURGER, group_name: "Proteína", name: "Mixta", price_delta: 1.5 },
			{ id: MEDIO, product_id: BURGER, group_name: "Punto", name: "Término medio", price_delta: 0 },
			{ id: AJENA, product_id: "otro", group_name: "Proteína", name: "Ajena", price_delta: 1 },
		],
	});

	it("suma el delta al precio base y a la oferta, y nombra la línea desde la base", async () => {
		const [item] = await buildOrderItemsFromBranch(supabase, BRANCH, [
			{ id: BURGER, name: "x", quantity: 2, price: 1, variant_ids: [MIXTA, MEDIO] },
		]);
		expect(item).toMatchObject({
			name: "Hamburguesa Americana (Mixta, Término medio)",
			price: 12.5,
			has_discount: true,
			discount_price: 10.5,
			quantity: 2,
			variant_ids: [MIXTA, MEDIO],
		});
	});

	it("con tamaño: precio del tamaño más el delta, sin oferta", async () => {
		const [item] = await buildOrderItemsFromBranch(supabase, BRANCH, [
			{ id: BURGER, name: "x", quantity: 1, price: 1, size_id: FAMILIAR, variant_ids: [MIXTA] },
		]);
		expect(item).toMatchObject({ name: "Hamburguesa Americana (Familiar, Mixta)", price: 19.5, has_discount: false, size_id: FAMILIAR, variant_ids: [MIXTA] });
	});

	it("descarta la línea con una variante ajena o con dos del mismo grupo", async () => {
		expect(await buildOrderItemsFromBranch(supabase, BRANCH, [{ id: BURGER, name: "x", quantity: 1, price: 1, variant_ids: [AJENA] }])).toEqual([]);
		expect(await buildOrderItemsFromBranch(supabase, BRANCH, [{ id: BURGER, name: "x", quantity: 1, price: 1, variant_ids: [CARNE, MIXTA] }])).toEqual([]);
	});
});
