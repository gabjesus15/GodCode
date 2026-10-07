"use client";

import { Plus, X } from "lucide-react";

import { Button } from "../../ui/Button";
import { Card } from "../../ui/Card";

import { nextKey, type EditableCategory, type EditableDraft, type EditableProduct } from "@/lib/menu/editable-draft";

export { toEditableDraft, type EditableCategory, type EditableDraft, type EditableProduct } from "@/lib/menu/editable-draft";

function isValidRow(p: EditableProduct): boolean {
	return p.name.trim().length > 0 && /\d/.test(p.price);
}

const inputClass =
	"h-9 w-full rounded-lg border border-[#d2d2d7] bg-white px-2.5 text-sm text-[#1d1d1f] focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

export function MenuImportReview({
	draft,
	note,
	busy,
	onChange,
	onCancel,
	onConfirm,
}: {
	draft: EditableDraft;
	note: string;
	busy: boolean;
	onChange: (draft: EditableDraft) => void;
	onCancel: () => void;
	onConfirm: (draft: EditableDraft) => void;
}) {
	const validCount = draft.reduce((sum, c) => sum + c.products.filter(isValidRow).length, 0);

	const updateCategory = (key: string, patch: Partial<EditableCategory>) =>
		onChange(draft.map((c) => (c.key === key ? { ...c, ...patch } : c)));
	const updateProduct = (categoryKey: string, productKey: string, patch: Partial<EditableProduct>) =>
		onChange(
			draft.map((c) =>
				c.key === categoryKey ? { ...c, products: c.products.map((p) => (p.key === productKey ? { ...p, ...patch } : p)) } : c,
			),
		);
	const removeProduct = (categoryKey: string, productKey: string) =>
		onChange(
			draft
				.map((c) => (c.key === categoryKey ? { ...c, products: c.products.filter((p) => p.key !== productKey) } : c))
				.filter((c) => c.products.length > 0),
		);
	const addProduct = (categoryKey: string) =>
		onChange(
			draft.map((c) =>
				c.key === categoryKey ? { ...c, products: [...c.products, { key: nextKey(), name: "", description: "", price: "" }] } : c,
			),
		);

	return (
		<Card compact className="space-y-4">
			<div>
				<p className="text-sm font-semibold text-[#1d1d1f]">Revisa lo que leímos de tu carta</p>
				<p className="mt-1 text-[13px] leading-relaxed text-[#6e6e73]">
					Corrige nombres y precios o quita lo que sobre. Nada se crea hasta que confirmes.
				</p>
				{note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">{note}</p>}
			</div>

			<div className="space-y-5">
				{draft.map((category) => (
					<div key={category.key} className="space-y-2">
						<input
							aria-label="Nombre de la categoría"
							value={category.name}
							onChange={(e) => updateCategory(category.key, { name: e.target.value })}
							className={`${inputClass} max-w-sm font-semibold`}
						/>
						<div className="space-y-2">
							{category.products.map((product) => (
								<div key={product.key} className="grid grid-cols-[1fr_6.5rem_2rem] gap-2 sm:grid-cols-[minmax(0,14rem)_1fr_7rem_2rem]">
									<input
										aria-label="Producto"
										placeholder="Producto"
										value={product.name}
										onChange={(e) => updateProduct(category.key, product.key, { name: e.target.value })}
										className={inputClass}
									/>
									<input
										aria-label="Descripción"
										placeholder="Descripción (opcional)"
										value={product.description}
										onChange={(e) => updateProduct(category.key, product.key, { description: e.target.value })}
										className={`${inputClass} col-span-3 row-start-2 sm:col-span-1 sm:row-start-auto`}
									/>
									<input
										aria-label="Precio"
										placeholder="Precio"
										inputMode="decimal"
										value={product.price}
										onChange={(e) => updateProduct(category.key, product.key, { price: e.target.value })}
										className={`${inputClass} text-right ${/\d/.test(product.price) ? "" : "border-red-300"}`}
									/>
									<button
										type="button"
										aria-label={`Quitar ${product.name || "producto"}`}
										onClick={() => removeProduct(category.key, product.key)}
										className="flex h-9 w-8 items-center justify-center rounded-lg text-[#a1a1a6] hover:bg-[#f5f5f7] hover:text-red-600"
									>
										<X className="h-4 w-4" aria-hidden />
									</button>
								</div>
							))}
						</div>
						<button
							type="button"
							onClick={() => addProduct(category.key)}
							className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
						>
							<Plus className="h-3.5 w-3.5" aria-hidden />
							Agregar producto
						</button>
					</div>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-2 border-t border-[#e5e5ea] pt-4">
				<Button loading={busy} disabled={validCount === 0} onClick={() => onConfirm(draft)}>
					{validCount === 1 ? "Crear 1 producto" : `Crear ${validCount} productos`}
				</Button>
				<Button variant="ghost" disabled={busy} onClick={onCancel}>
					Descartar
				</Button>
			</div>
		</Card>
	);
}
