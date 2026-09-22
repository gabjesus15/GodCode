"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import clsx from "clsx";
import { CupSoda, Minus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { TENANT_PRODUCT_FALLBACK_IMAGE } from "@/lib/tenant/config/tenant-assets";
import { isUpsellBeverageLineId, type AddToCartOptions } from "../cart-context";
import type { CartLineItem } from "../cart-modal-types";
import { safeImageSrc } from "../utils/image-src";
import { CartMoney } from "./cart-money";

function selectionsTotal(list: Array<{ price: number; qty: number }> | undefined): number {
	return (list ?? []).reduce(
		(sum, entry) => sum + (Number(entry.price) || 0) * (Number(entry.qty) || 1),
		0,
	);
}

function describe(list: Array<{ name: string; qty: number }> | undefined): string {
	return (list ?? []).map((entry) => `${entry.qty}x ${entry.name}`).join(", ");
}

export type CartLineProps = {
	item: CartLineItem;
	unitPrice: number;
	/** Posición en la lista: escalona la entrada (acotado, así la cola no espera). */
	index?: number;
	onAdd: (item: CartLineItem, options?: AddToCartOptions) => void;
	onDecrease: (lineId: string) => void;
	onRemove: (lineId: string) => void;
	onNoteChange: (lineId: string, note: string) => void;
};

const MAX_STAGGER_INDEX = 7;

/**
 * Una línea del pedido: foto, nombre, total de la línea, cantidad y nota.
 * Con cantidad 1 el "menos" se vuelve "quitar": un solo control para bajar.
 */
export function CartLine({
	item,
	unitPrice,
	index = 0,
	onAdd,
	onDecrease,
	onRemove,
	onNoteChange,
}: CartLineProps) {
	const t = useTranslations("tenant.cart.modal");
	const lineId = item.lineId ?? item.id;
	const [noteOpen, setNoteOpen] = useState(false);
	// Cada toque en ± remonta el número para que "salte"; al abrir el panel no salta.
	const [quantityBump, setQuantityBump] = useState(0);
	const note = item.line_note?.trim() ?? "";
	const hasNote = note.length > 0;
	const lineStyle = { "--i": Math.min(index, MAX_STAGGER_INDEX) } as CSSProperties;

	const isUpsellBeverage = isUpsellBeverageLineId(item.id);
	const imageSrc = safeImageSrc(item.image_url, TENANT_PRODUCT_FALLBACK_IMAGE);

	const extrasText = describe(item.selected_extras);
	const beveragesText = isUpsellBeverage ? "" : describe(item.selected_beverages);
	const lineUnit = Math.max(
		0,
		unitPrice +
			selectionsTotal(item.selected_extras) +
			(isUpsellBeverage ? 0 : selectionsTotal(item.selected_beverages)),
	);
	const meta = [
		extrasText ? `${t("catalog.extrasTab")}: ${extrasText}` : "",
		beveragesText ? `${t("catalog.beveragesTab")}: ${beveragesText}` : "",
		item.line_summary?.trim() ?? "",
	].filter(Boolean);

	return (
		<li className="cart-line" style={lineStyle}>
			{isUpsellBeverage ? (
				<span className="cart-line__media cart-line__media--glyph" aria-hidden>
					<CupSoda size={22} strokeWidth={1.8} />
				</span>
			) : (
				<Image
					src={imageSrc}
					alt=""
					width={56}
					height={56}
					quality={70}
					className="cart-line__media"
					onError={(event) => {
						event.currentTarget.src = TENANT_PRODUCT_FALLBACK_IMAGE;
					}}
				/>
			)}

			<div className="cart-line__body">
				<div className="cart-line__row">
					<h3 className="cart-line__name">{item.name || t("item.productFallback")}</h3>
					<CartMoney amount={lineUnit * item.quantity} className="cart-line__price" />
				</div>

				{meta.length > 0 ? <p className="cart-line__meta">{meta.join(" · ")}</p> : null}

				<div className="cart-line__row cart-line__row--controls">
					<div className="cart-stepper" role="group" aria-label={t("item.quantityAria")}>
						{item.quantity <= 1 ? (
							<button
								type="button"
								className="cart-stepper__btn cart-stepper__btn--remove"
								onClick={() => onRemove(lineId)}
								aria-label={t("item.removeProduct")}
							>
								<Trash2 size={14} aria-hidden />
							</button>
						) : (
							<button
								type="button"
								className="cart-stepper__btn"
								onClick={() => {
									setQuantityBump((bump) => bump + 1);
									onDecrease(lineId);
								}}
								aria-label={t("item.decreaseQuantity")}
							>
								<Minus size={14} aria-hidden />
							</button>
						)}
						<span
							key={quantityBump}
							className={clsx("cart-stepper__value", quantityBump > 0 && "is-pop")}
							aria-live="polite"
						>
							{item.quantity}
						</span>
						<button
							type="button"
							className="cart-stepper__btn"
							onClick={() => {
								setQuantityBump((bump) => bump + 1);
								onAdd(item, {
									selectedExtras: item.selected_extras ?? [],
									selectedBeverages: item.selected_beverages ?? [],
								});
							}}
							aria-label={t("item.increaseQuantity")}
						>
							<Plus size={14} aria-hidden />
						</button>
					</div>

					<button
						type="button"
						className={clsx("cart-link-btn", "cart-line__note-toggle", hasNote && "is-filled")}
						onClick={() => setNoteOpen((open) => !open)}
						aria-expanded={noteOpen}
					>
						{noteOpen ? t("notes.done") : hasNote ? t("notes.editTab") : t("notes.addTab")}
					</button>
				</div>

				{noteOpen ? (
					<textarea
						className="cart-field cart-line__note-input"
						value={item.line_note ?? ""}
						onChange={(event) => onNoteChange(lineId, event.target.value)}
						placeholder={t("notes.placeholder")}
						rows={2}
						aria-label={t("notes.inputAria")}
						autoFocus
					/>
				) : hasNote ? (
					<p className="cart-line__note">{note}</p>
				) : null}
			</div>
		</li>
	);
}
