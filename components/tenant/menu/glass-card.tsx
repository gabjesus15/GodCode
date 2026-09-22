"use client";

import { memo, useState, type KeyboardEvent, type MouseEvent } from "react";
import clsx from "clsx";
import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import {
	PRODUCT_IMAGE_SIZES,
	ProductCardImage,
	ProductOfferBadges,
	useProductPricing,
	type ProductCardLogic,
	type ProductCardProduct,
} from "./product-card-shared";

export type GlassCardProps = {
	product: ProductCardProduct;
	logic: ProductCardLogic;
	priority?: boolean;
	currency: string;
	detailsMode?: string;
	onClick?: () => void;
	onProductClick?: (productId: string) => void;
	/** Detalle "inline" con esta tarjeta: la descripción se despliega dentro de la tarjeta. */
	inlineDetails?: boolean;
	exchangeRate?: number | null;
};

const LONG_DESCRIPTION = 60;

/**
 * Tarjeta "Cristal": foto primero, nombre y precio en tinta, un solo control.
 * La tarjeta entera abre el detalle, así que no hace falta anunciarlo con un
 * rótulo; el acento del local se reserva para el cromo, no para cada "+".
 */
export const GlassCard = memo(function GlassCard({
	product,
	logic,
	priority = false,
	currency,
	detailsMode = "modal-premium",
	onClick,
	onProductClick,
	inlineDetails = false,
	exchangeRate,
}: GlassCardProps) {
	const t = useTranslations("tenant.menu");
	const pricing = useProductPricing(product, currency, logic, exchangeRate);
	const [expanded, setExpanded] = useState(false);
	const [pop, setPop] = useState(false);

	const name = product.name || t("card.productFallback");
	const description = product.description?.trim() ?? "";
	const canExpand = inlineDetails || (description.length > LONG_DESCRIPTION && !onProductClick && !onClick);
	const clickable = Boolean(onProductClick || onClick || canExpand);
	const showStepper = logic.hydrated && logic.quantity > 0;

	const openDetails = () => {
		if (onProductClick) return onProductClick(product.id);
		if (onClick) return onClick();
		if (canExpand) setExpanded((open) => !open);
	};

	const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			openDetails();
		}
	};

	const add = (event: MouseEvent<HTMLButtonElement>) => {
		logic.handleAdd(event);
		setPop(true);
	};

	const content = (
		<>
			<div className="gcard__media">
				<ProductCardImage
					src={logic.imageSrc}
					alt={name}
					priority={priority}
					sizes={PRODUCT_IMAGE_SIZES.grid}
					loaded={logic.imageLoaded}
					onLoaded={logic.setImageLoaded}
					onError={logic.setImageError}
				/>
				<ProductOfferBadges product={product} />
			</div>
			<div className="gcard__body">
				<h3 className="gcard__name">{name}</h3>
				{description ? <p className="gcard__desc">{description}</p> : null}
			</div>
		</>
	);

	return (
		<article
			className={clsx("product-card glass gcard", expanded && "is-expanded", detailsMode === "inline" && "gcard--inline")}
		>
			{clickable ? (
				<div
					className="gcard__hit"
					role="button"
					tabIndex={0}
					aria-label={t("card.detailsAria", { name })}
					aria-expanded={canExpand ? expanded : undefined}
					onClick={openDetails}
					onKeyDown={onKeyDown}
				>
					{content}
				</div>
			) : (
				<div className="gcard__hit gcard__hit--static">{content}</div>
			)}

			{expanded ? (
				<button
					type="button"
					className="gcard__close"
					onClick={() => setExpanded(false)}
					aria-label={t("card.closeDetails")}
				>
					<X size={14} aria-hidden />
				</button>
			) : null}

			<div className="gcard__foot">
				<div className="gcard__price">
					{pricing.hasDiscount && pricing.originalPrice ? (
						<span className="gcard__price--was">{pricing.originalPrice}</span>
					) : null}
					<span className={clsx("gcard__price-main", pricing.hasDiscount && "gcard__price-main--sale")}>{pricing.displayPrice}</span>
				</div>

				{/* Fuera de `.gcard__hit` a propósito: un botón dentro de un role="button"
				    sería un control anidado. */}
				{showStepper ? (
					<div className="gcard__stepper" role="group" aria-label={t("card.quantityAria")}>
						<button type="button" className="gcard__step" onClick={logic.handleDecrease} aria-label={t("card.removeOne")}>
							<Minus size={16} strokeWidth={2.5} aria-hidden />
						</button>
						<span className="gcard__count" aria-live="polite">
							{logic.quantity}
						</span>
						<button type="button" className="gcard__step gcard__step--plus" onClick={add} aria-label={t("card.addOne")}>
							<Plus size={16} strokeWidth={2.5} aria-hidden />
						</button>
					</div>
				) : (
					<button
						type="button"
						className={clsx("gcard__add", pop && "is-pop")}
						onClick={add}
						onAnimationEnd={() => setPop(false)}
						aria-label={t("card.addAria", { name })}
					>
						<Plus size={20} strokeWidth={2.5} aria-hidden />
					</button>
				)}
			</div>
		</article>
	);
});
