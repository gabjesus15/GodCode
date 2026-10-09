import { z } from "zod";

/** Topes de una carga de menú (importación o ejemplo): una carta real cabe holgada. */
export const MENU_DRAFT_MAX_CATEGORIES = 40;
export const MENU_DRAFT_MAX_PRODUCTS = 300;
const NAME_MAX = 120;
const DESCRIPTION_MAX = 500;
const PRICE_MAX = 100_000_000;

export type MenuDraftProduct = { name: string; description: string; price: number };
export type MenuDraftCategory = { name: string; products: MenuDraftProduct[] };
export type MenuDraft = { categories: MenuDraftCategory[] };

/**
 * Precio escrito como en una carta: `8.990`, `$12,50`, `1.234,5`, `12.5`. El último
 * separador seguido de 1 o 2 cifras es el decimal; uno seguido de 3 cifras es de miles
 * (en Chile `8.990` son ocho mil novecientos noventa, no 8,99).
 */
export function parseMenuPrice(raw: unknown): number | null {
	if (typeof raw === "number") return Number.isFinite(raw) && raw > 0 && raw <= PRICE_MAX ? round2(raw) : null;
	if (typeof raw !== "string") return null;
	const cleaned = raw.replace(/[^\d.,]/g, "");
	if (!/\d/.test(cleaned)) return null;
	const lastSep = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
	let value: number;
	if (lastSep === -1) {
		value = Number(cleaned);
	} else {
		const decimals = cleaned.slice(lastSep + 1);
		const integer = cleaned.slice(0, lastSep).replace(/[.,]/g, "");
		value = decimals.length > 0 && decimals.length <= 2 ? Number(`${integer}.${decimals}`) : Number(`${integer}${decimals}`);
	}
	return Number.isFinite(value) && value > 0 && value <= PRICE_MAX ? round2(value) : null;
}

function round2(value: number): number {
	return Math.round(value * 100) / 100;
}

function cleanText(raw: unknown, max: number): string {
	return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

const rawDraftSchema = z.object({
	categories: z.array(
		z.object({
			name: z.unknown(),
			products: z.array(z.object({ name: z.unknown(), description: z.unknown().optional(), price: z.unknown() })).default([]),
		}),
	),
});

export type NormalizedMenuDraft = {
	draft: MenuDraft;
	/** Filas descartadas por no tener nombre o precio válido. */
	dropped: number;
	/** Productos que quedaron fuera por pasar el tope. */
	truncated: number;
};

/**
 * Limpia un borrador que viene del navegador o de la IA: textos recortados, precios
 * válidos, sin categorías vacías ni nombres repetidos dentro de una categoría, y con los
 * topes de categorías y productos. Lo que no sirve se cuenta en vez de fallar todo.
 */
export function normalizeMenuDraft(input: unknown): NormalizedMenuDraft | null {
	const parsed = rawDraftSchema.safeParse(input);
	if (!parsed.success) return null;

	let dropped = 0;
	let truncated = 0;
	let total = 0;
	const byName = new Map<string, MenuDraftCategory>();

	for (const rawCategory of parsed.data.categories) {
		const categoryName = cleanText(rawCategory.name, NAME_MAX) || "Otros";
		const key = categoryName.toLocaleLowerCase("es");
		let category = byName.get(key);
		if (!category) {
			if (byName.size >= MENU_DRAFT_MAX_CATEGORIES) {
				truncated += rawCategory.products.length;
				continue;
			}
			category = { name: categoryName, products: [] };
			byName.set(key, category);
		}
		const seen = new Set(category.products.map((p) => p.name.toLocaleLowerCase("es")));
		for (const rawProduct of rawCategory.products) {
			const name = cleanText(rawProduct.name, NAME_MAX);
			const price = parseMenuPrice(rawProduct.price);
			if (!name || price == null) {
				dropped += 1;
				continue;
			}
			const productKey = name.toLocaleLowerCase("es");
			if (seen.has(productKey)) {
				dropped += 1;
				continue;
			}
			if (total >= MENU_DRAFT_MAX_PRODUCTS) {
				truncated += 1;
				continue;
			}
			seen.add(productKey);
			category.products.push({ name, description: cleanText(rawProduct.description, DESCRIPTION_MAX), price });
			total += 1;
		}
	}

	return {
		draft: { categories: [...byName.values()].filter((c) => c.products.length > 0) },
		dropped,
		truncated,
	};
}

export function countDraftProducts(draft: MenuDraft): number {
	return draft.categories.reduce((sum, c) => sum + c.products.length, 0);
}
