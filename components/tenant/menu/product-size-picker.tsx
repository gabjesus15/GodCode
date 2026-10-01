"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSheetDismiss } from "@/lib/tenant/hooks/use-sheet-dismiss";
import { composeSizedName, type ProductSizeOption } from "@/lib/tenant/product-sizes";
import type { CartProduct } from "../cart/cart-context";
import { useCartStore } from "../cart/cart-store";
import { useCartDialog } from "../cart/hooks/use-cart-dialog";
import {
	useProductCardLogic,
	useProductPricing,
	type ProductCardProduct,
} from "./product-card-shared";
import { useSizePickerStore } from "./product-size-store";

import "../../../app/[subdomain]/styles/ProductDetailsSheet.css";

/** Producto listo para el carrito con el tamaño elegido: precio propio y sin oferta. */
export function toSizedCartProduct(product: ProductCardProduct, size: ProductSizeOption): CartProduct {
	return {
		id: product.id,
		name: composeSizedName(product.name, size.name),
		description: product.description ?? null,
		image_url: product.image_url ?? null,
		price: size.price,
		has_discount: false,
		discount_price: null,
		size_id: size.id,
		size_name: size.name,
	};
}

/** Unidades en el carrito por tamaño de un producto. */
function useQuantityBySize(productId: string): Map<string, number> {
	const cart = useCartStore((state) => state.cart);
	const bySize = new Map<string, number>();
	for (const item of cart) {
		if (item.id !== productId || !item.size_id) continue;
		bySize.set(item.size_id, (bySize.get(item.size_id) ?? 0) + (Number(item.quantity) || 0));
	}
	return bySize;
}

/** Lista de tamaños como radios: nombre a la izquierda, precio a la derecha. */
export function ProductSizeOptions({
	productId,
	productName,
	sizes,
	selectedId,
	onSelect,
	formatPrice,
}: {
	productId: string;
	productName: string;
	sizes: ProductSizeOption[];
	selectedId: string | null;
	onSelect: (sizeId: string) => void;
	formatPrice: (amount: number) => string;
}) {
	const t = useTranslations("tenant.menu");
	const groupName = useId();
	const quantityBySize = useQuantityBySize(productId);

	return (
		<fieldset className="pds-sizes">
			<legend className="pds-sizes__title">{t("sizes.title")}</legend>
			<div className="pds-sizes__list" role="radiogroup" aria-label={t("sizes.groupAria", { name: productName })}>
				{sizes.map((size) => {
					const inCart = quantityBySize.get(size.id) ?? 0;
					const checked = size.id === selectedId;
					return (
						<label key={size.id} className={clsx("pds-size", checked && "is-checked")}>
							<input
								type="radio"
								name={groupName}
								value={size.id}
								checked={checked}
								onChange={() => onSelect(size.id)}
								className="pds-size__input"
							/>
							<span className="pds-size__dot" aria-hidden />
							<span className="pds-size__name">
								{size.name}
								{inCart > 0 ? (
									<span className="pds-size__badge">{t("sizes.sizeInCart", { count: inCart })}</span>
								) : null}
							</span>
							<span className="pds-size__price">{formatPrice(size.price)}</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

/** Estado del tamaño elegido; arranca en el primero (el orden lo define el panel). */
export function useSizeSelection(sizes: ProductSizeOption[] | undefined) {
	const [chosenId, setChosenId] = useState<string | null>(null);
	const selected = sizes?.find((size) => size.id === chosenId) ?? sizes?.[0] ?? null;
	return { selected, select: setChosenId };
}

const EXIT_MS = 200;
const subscribeNoop = () => () => {};

/**
 * Hoja para elegir tamaño al agregar desde la tarjeta o el panel en línea. Se monta una sola
 * vez en el menú y la abre `useSizePickerStore`.
 */
export function ProductSizeSheet({
	country = "CL",
	currency = "CLP",
	exchangeRate,
}: {
	country?: string;
	currency?: string;
	exchangeRate?: number | null;
}) {
	const product = useSizePickerStore((state) => state.product);
	const close = useSizePickerStore((state) => state.close);
	// Una clave por producto reinicia la selección y la animación al cambiar de producto.
	if (!product?.sizes?.length) return null;
	return (
		<ProductSizeSheetPanel
			key={product.id}
			product={product}
			onClose={close}
			country={country}
			currency={currency}
			exchangeRate={exchangeRate}
		/>
	);
}

function ProductSizeSheetPanel({
	product,
	onClose,
	country,
	currency,
	exchangeRate,
}: {
	product: ProductCardProduct;
	onClose: () => void;
	country: string;
	currency: string;
	exchangeRate?: number | null;
}) {
	const t = useTranslations("tenant.menu");
	const titleId = useId();
	const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
	const addToCart = useCartStore((state) => state.addToCart);
	const logic = useProductCardLogic(product, country);
	const pricing = useProductPricing(product, currency, logic, exchangeRate);
	const { selected, select } = useSizeSelection(product.sizes);
	const [closing, setClosing] = useState(false);
	const panelRef = useRef<HTMLElement>(null);
	const headRef = useRef<HTMLDivElement>(null);

	const requestClose = useCallback(() => {
		setClosing((already) => {
			if (already) return already;
			window.setTimeout(onClose, EXIT_MS);
			return true;
		});
	}, [onClose]);

	useCartDialog(panelRef, mounted);
	useSheetDismiss(panelRef, headRef, { enabled: mounted && !closing, onDismiss: requestClose });

	useEffect(() => {
		if (!mounted) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") requestClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [mounted, requestClose]);

	if (!mounted || !product.sizes) return null;

	const name = product.name || t("card.productFallback");
	const handleAdd = () => {
		if (!selected) return;
		addToCart(toSizedCartProduct(product, selected));
		requestClose();
	};

	const sheet = (
		<div className="pds-overlay" data-closing={closing || undefined} onClick={requestClose}>
			<section
				ref={panelRef}
				className="pds pds--compact"
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				onClick={(event) => event.stopPropagation()}
			>
				<div className="pds__head" ref={headRef}>
					<span className="pds__handle" aria-hidden />
					<button type="button" className="pds__close" onClick={requestClose} aria-label={t("details.close")}>
						<X size={18} aria-hidden />
					</button>
				</div>

				<div className="pds__body">
					<div className="pds__content">
						<h2 id={titleId} className="pds__title">
							{name}
						</h2>
						<ProductSizeOptions
							productId={product.id}
							productName={name}
							sizes={product.sizes}
							selectedId={selected?.id ?? null}
							onSelect={select}
							formatPrice={pricing.formatPrice}
						/>
					</div>
				</div>

				<footer className="pds__foot">
					<button type="button" className="pds__cta pds__cta--wide" onClick={handleAdd} disabled={!selected}>
						{t("details.addWithPrice", { price: pricing.formatPrice(selected?.price ?? 0) })}
					</button>
				</footer>
			</section>
		</div>
	);

	return createPortal(sheet, document.getElementById("modal-root") ?? document.body);
}
