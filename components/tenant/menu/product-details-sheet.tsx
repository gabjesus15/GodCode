"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import clsx from "clsx";
import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useSheetDismiss } from "@/lib/tenant/hooks/use-sheet-dismiss";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
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
const subscribeNoop = () => () => {};

/**
 * Detalle de producto: foto, nombre, precio, descripción completa y un pie con
 * el control de cantidad. Es una hoja que sube desde abajo en teléfono y una
 * tarjeta centrada en escritorio; se cierra tocando fuera, con Escape, con el
 * atrás del navegador o arrastrando la cabecera hacia abajo.
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
	const logic = useProductCardLogic(product ?? EMPTY_PRODUCT, country);
	const pricing = useProductPricing(product ?? EMPTY_PRODUCT, currency, logic, exchangeRate);
	const [closing, setClosing] = useState(false);
	const panelRef = useRef<HTMLElement>(null);
	const headRef = useRef<HTMLDivElement>(null);
	const active = isOpen && mounted && Boolean(product);

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

	if (!active || !product) return null;

	const name = product.name || t("card.productFallback");
	const description = product.description?.trim() ?? "";
	const inCart = logic.hydrated && logic.quantity > 0;
	const canOrder = onlineOrderingEnabled !== false;

	const sheet = (
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
					<div className="pds__media">
						<Image
							src={logic.imageSrc}
							alt={name}
							fill
							sizes="(max-width: 767px) 100vw, 460px"
							quality={85}
							priority
							unoptimized={shouldUnoptimizeImageSrc(logic.imageSrc)}
							className="pds__img"
							onError={() => logic.setImageError()}
						/>
						<ProductOfferBadges product={product} />
					</div>

					<div className="pds__content">
						<h2 id={titleId} className="pds__title">
							{name}
						</h2>
						<p className="pds__price">
							{pricing.hasDiscount && pricing.originalPrice ? (
								<span className="pds__price-was">{pricing.originalPrice}</span>
							) : null}
							<span className={clsx("pds__price-main", pricing.hasDiscount && "pds__price-main--sale")}>
								{pricing.displayPrice}
							</span>
						</p>
						{description ? <p className="pds__desc">{description}</p> : null}
					</div>
				</div>

				{canOrder ? (
					<footer className="pds__foot">
						{inCart ? (
							<>
								<div className="pds__stepper" role="group" aria-label={t("details.quantity")}>
									<button type="button" className="pds__step" onClick={logic.handleDecrease} aria-label={t("details.decrease")}>
										<Minus size={18} strokeWidth={2.5} aria-hidden />
									</button>
									<span className="pds__count" aria-live="polite">
										{logic.quantity}
									</span>
									<button type="button" className="pds__step pds__step--plus" onClick={logic.handleAdd} aria-label={t("details.increase")}>
										<Plus size={18} strokeWidth={2.5} aria-hidden />
									</button>
								</div>
								<button type="button" className="pds__cta" onClick={requestClose}>
									{t("details.done")}
								</button>
							</>
						) : (
							<button type="button" className="pds__cta pds__cta--wide" onClick={logic.handleAdd}>
								{t("details.addWithPrice", { price: pricing.displayPrice })}
							</button>
						)}
					</footer>
				) : null}
			</section>
		</div>
	);

	return createPortal(sheet, document.getElementById("modal-root") ?? document.body);
}
