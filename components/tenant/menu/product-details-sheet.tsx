"use client";

import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import clsx from "clsx";
import { AnimatePresence, LazyMotion, domMax, m, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useLowEndDevice } from "@/lib/tenant/hooks/use-low-end-device";
import { useSheetDismiss } from "@/lib/tenant/hooks/use-sheet-dismiss";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import { composeLineName, type ProductSizeOption } from "@/lib/tenant/product-sizes";
import type { ProductVariantGroup, ProductVariantOption } from "@/lib/tenant/product-variants";
import type { CartProduct } from "../cart/cart-context";
import { useCartStore } from "../cart/cart-store";
import { useCartDialog } from "../cart/hooks/use-cart-dialog";
import {
	ProductOfferBadges,
	useProductCardLogic,
	useProductPricing,
	type ProductCardProduct,
} from "./product-card-shared";

import "../../../app/[subdomain]/styles/ProductDetailsSheet.css";

export type ProductDetailsSheetProps = {
	isOpen: boolean;
	onClose: () => void;
	product: ProductCardProduct | null;
	country?: string;
	currency?: string;
	onlineOrderingEnabled?: boolean;
	exchangeRate?: number | null;
};

/** Los hooks corren siempre; sin producto trabajan sobre este vacío y no se pinta nada. */
const EMPTY_PRODUCT: ProductCardProduct = { id: "", name: null, price: 0 };
const EXIT_MS = 200;
/** Lo que dura "Agregado ✓" antes de cerrar: suficiente para leerlo, no para esperar. */
const ADDED_MS = 620;
const MAX_QTY = 20;
const EASE = [0.16, 1, 0.3, 1] as const;
/** El plato: muelle con algo de masa para que "asiente", sin rebote de más. */
const PLATE_SPRING = { type: "spring", stiffness: 260, damping: 24, mass: 0.9 } as const;
/** El pulgar del segmentado: rápido y seco. */
const THUMB_SPRING = { type: "spring", stiffness: 520, damping: 40 } as const;
const INSTANT = { duration: 0 } as const;
const subscribeNoop = () => () => {};

/** Escala del plato por tamaño: del 68 % al 100 % repartido por posición, no por precio. */
function plateScale(index: number, count: number): number {
	if (count <= 1 || index < 0) return 1;
	return 0.68 + 0.32 * (index / (count - 1));
}

/** Un PNG casi siempre es un recorte sin fondo: se dibuja entero, sin recorte ni marco. */
function isCutoutSource(src: string): boolean {
	try {
		return new URL(src, "http://local").pathname.toLowerCase().endsWith(".png");
	} catch {
		return /\.png(?:$|\?)/i.test(src);
	}
}

type Direction = 1 | -1;

/** Valor que se desliza al cambiar: entra desde abajo si sube y desde arriba si baja. */
function SlidingValue({
	label,
	direction,
	reduced,
	className,
}: {
	label: string;
	direction: Direction;
	reduced: boolean;
	className?: string;
}) {
	const offset = reduced ? 0 : 12 * direction;
	return (
		<span className={clsx("pds-num", className)}>
			<AnimatePresence initial={false} mode="popLayout">
				<m.span
					key={label}
					className="pds-num__value"
					initial={{ opacity: 0, y: offset }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -offset }}
					transition={{ duration: reduced ? 0.12 : 0.28, ease: EASE }}
				>
					{label}
				</m.span>
			</AnimatePresence>
		</span>
	);
}

/** Dirección del cambio respecto del valor anterior (para SlidingValue): estado derivado. */
function useDirection(value: number): Direction {
	const [previous, setPrevious] = useState(value);
	const [direction, setDirection] = useState<Direction>(1);
	if (value !== previous) {
		const next: Direction = value >= previous ? 1 : -1;
		setPrevious(value);
		setDirection(next);
		return next;
	}
	return direction;
}

function SizeSegments({
	sizes,
	selectedId,
	onSelect,
	formatPrice,
	productName,
	reduced,
	style,
}: {
	sizes: ProductSizeOption[];
	selectedId: string;
	onSelect: (id: string) => void;
	formatPrice: (amount: number) => string;
	productName: string;
	reduced: boolean;
	style?: CSSProperties;
}) {
	const t = useTranslations("tenant.menu");
	const groupId = useId();
	return (
		<fieldset className="pds-sizes" style={style}>
			<legend className="pds-sizes__title">{t("sizes.title")}</legend>
			<div className="pds-seg" role="radiogroup" aria-label={t("sizes.groupAria", { name: productName })}>
				{sizes.map((size) => {
					const checked = size.id === selectedId;
					return (
						<label key={size.id} className={clsx("pds-seg__item", checked && "is-checked")}>
							{checked ? (
								<m.span
									layoutId={`${groupId}-thumb`}
									className="pds-seg__thumb"
									aria-hidden
									transition={reduced ? INSTANT : THUMB_SPRING}
								/>
							) : null}
							<input
								type="radio"
								name={groupId}
								value={size.id}
								checked={checked}
								onChange={() => onSelect(size.id)}
								className="pds-seg__input"
							/>
							<span className="pds-seg__name">{size.name}</span>
							<span className="pds-seg__price">{formatPrice(size.price)}</span>
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

function VariantChips({
	group,
	selectedId,
	onSelect,
	formatDelta,
	style,
}: {
	group: ProductVariantGroup;
	selectedId: string;
	onSelect: (id: string) => void;
	formatDelta: (delta: number) => string;
	style?: CSSProperties;
}) {
	const groupId = useId();
	return (
		<fieldset className="pds-opts" style={style}>
			<legend className="pds-opts__title">{group.name}</legend>
			<div className="pds-chips" role="radiogroup" aria-label={group.name}>
				{group.options.map((option) => {
					const checked = option.id === selectedId;
					return (
						<label key={option.id} className={clsx("pds-chip", checked && "is-checked")}>
							<input
								type="radio"
								name={groupId}
								value={option.id}
								checked={checked}
								onChange={() => onSelect(option.id)}
								className="pds-chip__input"
							/>
							<span className="pds-chip__dot" aria-hidden>
								<Check size={11} strokeWidth={3.2} />
							</span>
							<span className="pds-chip__name">{option.name}</span>
							{option.priceDelta !== 0 ? (
								<span className="pds-chip__delta">{formatDelta(option.priceDelta)}</span>
							) : null}
						</label>
					);
				})}
			</div>
		</fieldset>
	);
}

/**
 * Hoja de producto: el plato sobre su escenario, nombre, precio, descripción y, si el
 * local los definió, los tamaños (el plato crece con el elegido) y las variantes
 * (chips, una por grupo). Abajo, cantidad y "Agregar · total". Sube desde abajo en
 * teléfono y es una tarjeta centrada en escritorio; se cierra tocando fuera, con
 * Escape, con el atrás del navegador o arrastrando la cabecera hacia abajo.
 */
export function ProductDetailsSheet({
	isOpen,
	onClose,
	product,
	country = "CL",
	currency = "CLP",
	onlineOrderingEnabled,
	exchangeRate,
}: ProductDetailsSheetProps) {
	const t = useTranslations("tenant.menu");
	const titleId = useId();
	const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
	const reduced = useReducedMotion() ?? false;
	const lite = useLowEndDevice();
	const logic = useProductCardLogic(product ?? EMPTY_PRODUCT, country);
	const pricing = useProductPricing(product ?? EMPTY_PRODUCT, currency, logic, exchangeRate);
	const addToCart = useCartStore((state) => state.addToCart);
	const [closing, setClosing] = useState(false);
	const panelRef = useRef<HTMLElement>(null);
	const headRef = useRef<HTMLDivElement>(null);
	const active = isOpen && mounted && Boolean(product);

	// --- Configuración: tamaño, variantes (una por grupo), cantidad ---
	const sizes = product?.sizes && product.sizes.length > 0 ? product.sizes : null;
	const groups = useMemo(
		() => (product?.variants ?? []).filter((group) => group.options.length > 0),
		[product],
	);
	const [sizeId, setSizeId] = useState<string | null>(null);
	const [variantChoice, setVariantChoice] = useState<Record<string, string>>({});
	const [qty, setQty] = useState(1);
	const [added, setAdded] = useState(false);
	const [brokenSrc, setBrokenSrc] = useState<string | null>(null);

	const selectedSize = sizes ? (sizes.find((size) => size.id === sizeId) ?? sizes[0]) : null;
	const selectedOptions: ProductVariantOption[] = groups.map(
		(group) => group.options.find((option) => option.id === variantChoice[group.name]) ?? group.options[0],
	);

	const requestClose = useCallback(() => {
		setClosing((already) => {
			if (already) return already;
			window.setTimeout(onClose, EXIT_MS);
			return true;
		});
	}, [onClose]);

	useCartDialog(panelRef, active);
	useSheetDismiss(panelRef, headRef, { enabled: active && !closing, onDismiss: requestClose });

	useEffect(() => {
		if (!active) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") requestClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [active, requestClose]);

	// --- Precio: base o tamaño, más los deltas de variante; la oferta solo sin tamaño ---
	const delta = selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0);
	const basePrice = selectedSize ? selectedSize.price : Number(product?.price) || 0;
	const discountBase =
		!selectedSize &&
		product?.has_discount &&
		typeof product.discount_price === "number" &&
		product.discount_price > 0 &&
		product.discount_price < basePrice
			? product.discount_price
			: null;
	const unitPrice = (discountBase ?? basePrice) + delta;
	const wasPrice = discountBase != null ? basePrice + delta : null;
	const total = unitPrice * qty;
	const unitDirection = useDirection(unitPrice);
	const totalDirection = useDirection(total);
	const qtyDirection = useDirection(qty);

	if (!active || !product) return null;

	const name = product.name || t("card.productFallback");
	const description = product.description?.trim() ?? "";
	const canOrder = onlineOrderingEnabled !== false;
	const variantImage = selectedOptions.find((option) => option.imageUrl)?.imageUrl ?? null;
	const heroSrc = variantImage && brokenSrc !== variantImage ? variantImage : logic.imageSrc;
	const fit = isCutoutSource(heroSrc) ? "contain" : "cover";
	const scale = sizes ? plateScale(sizes.findIndex((size) => size.id === selectedSize?.id), sizes.length) : 1;
	const plateTransition = reduced ? INSTANT : PLATE_SPRING;
	const formatDelta = (amount: number) =>
		`${amount > 0 ? "+" : "−"}${pricing.formatPrice(Math.abs(amount))}`;
	const row = (index: number) => ({ "--i": index }) as CSSProperties;

	const handleAdd = () => {
		if (added) return;
		const names = selectedOptions.map((option) => option.name);
		const cartProduct: CartProduct = {
			id: product.id,
			name: composeLineName(product.name, [selectedSize?.name ?? null, ...names]),
			description: product.description ?? null,
			image_url: variantImage ?? product.image_url ?? null,
			price: basePrice + delta,
			has_discount: discountBase != null,
			discount_price: discountBase != null ? discountBase + delta : null,
			...(selectedSize ? { size_id: selectedSize.id, size_name: selectedSize.name } : {}),
			...(selectedOptions.length > 0
				? { variant_ids: selectedOptions.map((option) => option.id), variant_names: names, variant_delta: delta }
				: {}),
		};
		addToCart(cartProduct, { quantity: qty });
		setAdded(true);
		window.setTimeout(requestClose, ADDED_MS);
	};

	const sheet = (
		<LazyMotion features={domMax} strict>
			<div className="pds-overlay" data-closing={closing || undefined} onClick={requestClose}>
				<section
					ref={panelRef}
					className="pds"
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
						<div className={clsx("pds__stage", lite && "pds__stage--lite")} data-fit={fit}>
							<span className="pds__glow" aria-hidden />
							<m.span
								className="pds__plate-shadow"
								aria-hidden
								initial={false}
								animate={{ scaleX: scale, scaleY: 0.85 + 0.15 * scale, opacity: 0.45 + 0.55 * scale }}
								transition={plateTransition}
							/>
							<m.div
								className="pds__plate"
								initial={reduced ? false : { scale: scale * 0.88, opacity: 0 }}
								animate={{ scale, opacity: 1 }}
								transition={plateTransition}
							>
								<AnimatePresence initial={false}>
									<m.div
										key={heroSrc}
										className="pds__img-wrap"
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: reduced ? 0.12 : 0.3, ease: EASE }}
									>
										<Image
											src={heroSrc}
											alt={name}
											fill
											sizes="(max-width: 767px) 70vw, 300px"
											quality={85}
											priority
											unoptimized={shouldUnoptimizeImageSrc(heroSrc)}
											className="pds__img"
											onError={() => {
												if (heroSrc === variantImage) setBrokenSrc(variantImage);
												else logic.setImageError();
											}}
										/>
									</m.div>
								</AnimatePresence>
							</m.div>
							<ProductOfferBadges product={product} />
							{selectedSize ? (
								<AnimatePresence initial={false} mode="popLayout">
									<m.span
										key={selectedSize.id}
										className="pds__stage-tag"
										initial={{ opacity: 0, y: reduced ? 0 : 6 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: reduced ? 0 : -6 }}
										transition={{ duration: 0.22, ease: EASE }}
									>
										{selectedSize.name}
									</m.span>
								</AnimatePresence>
							) : null}
						</div>

						<div className="pds__content">
							<h2 id={titleId} className="pds__title" style={row(0)}>
								{name}
							</h2>
							<p className="pds__price" style={row(1)}>
								{wasPrice != null ? <span className="pds__price-was">{pricing.formatPrice(wasPrice)}</span> : null}
								<span className={clsx("pds__price-main", wasPrice != null && "pds__price-main--sale")}>
									<SlidingValue label={pricing.formatPrice(unitPrice)} direction={unitDirection} reduced={reduced} />
								</span>
							</p>
							{description ? (
								<p className="pds__desc" style={row(2)}>
									{description}
								</p>
							) : null}
							{sizes && selectedSize ? (
								<SizeSegments
									sizes={sizes}
									selectedId={selectedSize.id}
									onSelect={setSizeId}
									formatPrice={pricing.formatPrice}
									productName={name}
									reduced={reduced}
									style={row(3)}
								/>
							) : null}
							{groups.map((group, index) => (
								<VariantChips
									key={group.name}
									group={group}
									selectedId={selectedOptions[index]?.id ?? ""}
									onSelect={(id) => setVariantChoice((prev) => ({ ...prev, [group.name]: id }))}
									formatDelta={formatDelta}
									style={row(4 + index)}
								/>
							))}
						</div>
					</div>

					{canOrder ? (
						<footer className="pds__foot">
							<div className="pds__stepper" role="group" aria-label={t("details.quantity")}>
								<button
									type="button"
									className="pds__step"
									onClick={() => setQty((value) => Math.max(1, value - 1))}
									disabled={qty <= 1 || added}
									aria-label={t("details.decrease")}
								>
									<Minus size={18} strokeWidth={2.5} aria-hidden />
								</button>
								<span className="pds__count" aria-live="polite">
									<SlidingValue label={String(qty)} direction={qtyDirection} reduced={reduced} />
								</span>
								<button
									type="button"
									className="pds__step"
									onClick={() => setQty((value) => Math.min(MAX_QTY, value + 1))}
									disabled={qty >= MAX_QTY || added}
									aria-label={t("details.increase")}
								>
									<Plus size={18} strokeWidth={2.5} aria-hidden />
								</button>
							</div>
							<m.button
								type="button"
								className={clsx("pds__cta", added && "is-added")}
								onClick={handleAdd}
								disabled={added}
								whileTap={reduced || added ? undefined : { scale: 0.97 }}
								animate={added && !reduced ? { scale: [1, 1.04, 1] } : { scale: 1 }}
								transition={{ duration: 0.4, ease: EASE }}
							>
								<span className="pds__cta-label" aria-live="polite">
									<AnimatePresence initial={false} mode="popLayout">
										{added ? (
											<m.span
												key="added"
												className="pds__cta-label"
												initial={{ opacity: 0, y: reduced ? 0 : 10 }}
												animate={{ opacity: 1, y: 0 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.24, ease: EASE }}
											>
												<Check size={18} strokeWidth={2.75} aria-hidden />
												{t("details.added")}
											</m.span>
										) : (
											<m.span
												key="add"
												className="pds__cta-label"
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0, y: reduced ? 0 : -10 }}
												transition={{ duration: 0.2, ease: EASE }}
											>
												{t("details.add")}
												<span className="pds__cta-dot" aria-hidden>
													·
												</span>
												<SlidingValue label={pricing.formatPrice(total)} direction={totalDirection} reduced={reduced} />
											</m.span>
										)}
									</AnimatePresence>
								</span>
							</m.button>
						</footer>
					) : null}
				</section>
			</div>
		</LazyMotion>
	);

	return createPortal(sheet, document.getElementById("modal-root") ?? document.body);
}
