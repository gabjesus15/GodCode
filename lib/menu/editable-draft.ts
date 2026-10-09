/** Borrador editable de una carta leída: el precio queda como texto mientras el dueño lo corrige. */
export type EditableProduct = { key: string; name: string; description: string; price: string };
export type EditableCategory = { key: string; name: string; products: EditableProduct[] };
export type EditableDraft = EditableCategory[];

let keySeq = 0;
export const nextKey = () => `row-${++keySeq}`;

export function toEditableDraft(draft: {
	categories: Array<{ name: string; products: Array<{ name: string; description: string; price: number }> }>;
}): EditableDraft {
	return draft.categories.map((c) => ({
		key: nextKey(),
		name: c.name,
		products: c.products.map((p) => ({ key: nextKey(), name: p.name, description: p.description, price: String(p.price) })),
	}));
}
