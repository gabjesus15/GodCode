"use client";

import React from "react";

import {
	CardCartActions,
	ProductCardImage,
	ProductOfferBadges,
	ProductPriceBlock,
	ProductQtyBadge,
	productInitials,
	truncateText,
	useProductPricing,
	type ProductCardLogic,
	type ProductCardProduct,
} from "./product-card-shared";

export type LayoutCardProps = {
	product: ProductCardProduct;
	logic: ProductCardLogic;
	currency: string;
	priority: boolean;
	onClick?: () => void;
	detailsMode?: string;
	exchangeRate?: number | null;
};

/**
 * Tarjetas pensadas para comida (plantillas de menú por tipo de negocio).
 *
 * A diferencia de las de product-card-layouts (sacadas de tiendas de ropa,
 * zapatillas o gaming), estas cuatro:
 * - leen solo los tokens de superficie del menú (`--menu-*`), así que se ven
 *   bien en claro y en oscuro sin reglas aparte;
 * - no fingen foto: un producto sin imagen lleva un relleno con su inicial en
 *   la tipografía del local, en vez de repetir la misma foto de stock en toda
 *   la carta;
 * - dejan el nombre y el precio siempre a la vista, sin hover.
 */

const PHOTO_SIZES = {
	row: "(max-width: 640px) 112px, 136px",
	tile: "(max-width: 480px) 46vw, (max-width: 1024px) 30vw, 260px",
	poster: "(max-width: 480px) 48vw, (max-width: 1024px) 32vw, 300px",
} as const;

function interactionProps(onClick?: () => void) {
	if (!onClick) return {};
	return {
		onClick,
		role: "button" as const,
		tabIndex: 0,
		onKeyDown: (e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onClick();
			}
		},
	};
}

function FoodPhoto({
	logic,
	name,
	priority,
	sizes,
	className,
}: {
	logic: ProductCardLogic;
	name: string | null;
	priority: boolean;
	sizes: string;
	className: string;
}) {
	if (!logic.hasPhoto) {
		return (
			<div className={`${className} fcard-photo fcard-photo--empty`} aria-hidden>
				<span className="fcard-photo__initials">{productInitials(name)}</span>
			</div>
		);
	}
	return (
		<div className={`${className} fcard-photo`}>
			<ProductCardImage
				src={logic.imageSrc}
				alt={name ?? ""}
				priority={priority}
				sizes={sizes}
				imageClassName="fcard-photo__img"
				objectPosition="center center"
				loaded={logic.imageLoaded}
				onLoaded={() => logic.setImageLoaded(true)}
				onError={() => {
					logic.setImageError(true);
					logic.setImageLoaded(true);
				}}
			/>
		</div>
	);
}

/** Carta — fila de texto con la foto a la derecha, como una carta impresa. */
export const CartaCard = React.memo(function CartaCard({ product, logic, currency, priority, onClick, exchangeRate }: LayoutCardProps) {
	const pricing = useProductPricing(product, currency, logic, exchangeRate);
	const description = truncateText(product.description, 110);

	return (
		<article
			className={`product-layout-carta fcard${logic.hasPhoto ? "" : " fcard--no-photo"}`}
			{...interactionProps(onClick)}
		>
			<div className="carta-text">
				<h3 className="carta-title">{product.name}</h3>
				{description ? <p className="carta-desc">{description}</p> : null}
				<ProductPriceBlock
					pricing={pricing}
					blockClassName="fcard-price"
					priceClassName="fcard-price__now"
					originalClassName="fcard-price__old"
				/>
			</div>
			<div className="carta-side">
				{logic.hasPhoto ? (
					<div className="carta-photo-wrap">
						<ProductOfferBadges product={product} />
						<FoodPhoto logic={logic} name={product.name} priority={priority} sizes={PHOTO_SIZES.row} className="carta-photo" />
					</div>
				) : (
					<ProductOfferBadges product={product} />
				)}
				<div className="carta-action" onClick={(e) => e.stopPropagation()}>
					<CardCartActions logic={logic} addClassName="fcard-add" stepperClassName="fcard-stepper" compact />
				</div>
			</div>
		</article>
	);
});

/** Vitrina — foto cuadrada y ficha limpia; luminosa, de cafetería o pastelería. */
export const VitrinaCard = React.memo(function VitrinaCard({ product, logic, currency, priority, onClick, exchangeRate }: LayoutCardProps) {
	const pricing = useProductPricing(product, currency, logic, exchangeRate);
	const description = truncateText(product.description, 70);

	return (
		<article className="product-layout-vitrina fcard" {...interactionProps(onClick)}>
			<div className="vitrina-photo-wrap">
				<ProductOfferBadges product={product} />
				<ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="fcard-qty" />
				<FoodPhoto logic={logic} name={product.name} priority={priority} sizes={PHOTO_SIZES.tile} className="vitrina-photo" />
			</div>
			<div className="vitrina-body">
				<h3 className="vitrina-title">{product.name}</h3>
				{description ? <p className="vitrina-desc">{description}</p> : null}
				<div className="vitrina-foot">
					<ProductPriceBlock
						pricing={pricing}
						blockClassName="fcard-price"
						priceClassName="fcard-price__now"
						originalClassName="fcard-price__old"
					/>
					<div onClick={(e) => e.stopPropagation()}>
						<CardCartActions logic={logic} addClassName="fcard-add" stepperClassName="fcard-stepper" compact />
					</div>
				</div>
			</div>
		</article>
	);
});

/** Cartel — la foto llena la tarjeta y el nombre va encima, grande; pizza, hamburguesa, comida rápida. */
export const CartelCard = React.memo(function CartelCard({ product, logic, currency, priority, onClick, exchangeRate }: LayoutCardProps) {
	const pricing = useProductPricing(product, currency, logic, exchangeRate);

	return (
		<article
			className={`product-layout-cartel fcard${logic.hasPhoto ? "" : " fcard--no-photo"}`}
			{...interactionProps(onClick)}
		>
			<FoodPhoto logic={logic} name={product.name} priority={priority} sizes={PHOTO_SIZES.poster} className="cartel-photo" />
			<div className="cartel-shade" aria-hidden />
			<div className="cartel-top">
				<ProductOfferBadges product={product} />
				<ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="fcard-qty" />
			</div>
			<div className="cartel-body">
				<h3 className="cartel-title">{product.name}</h3>
				<div className="cartel-foot">
					<ProductPriceBlock
						pricing={pricing}
						blockClassName="fcard-price cartel-price"
						priceClassName="fcard-price__now"
						originalClassName="fcard-price__old"
					/>
					<div onClick={(e) => e.stopPropagation()}>
						<CardCartActions logic={logic} addClassName="fcard-add" stepperClassName="fcard-stepper" compact />
					</div>
				</div>
			</div>
		</article>
	);
});

/** Nori — oscura y sobria: foto de canto a canto, texto corto y una línea fina; sushi y cocina de autor. */
export const NoriCard = React.memo(function NoriCard({ product, logic, currency, priority, onClick, exchangeRate }: LayoutCardProps) {
	const pricing = useProductPricing(product, currency, logic, exchangeRate);
	const description = truncateText(product.description, 64);

	return (
		<article className="product-layout-nori fcard" {...interactionProps(onClick)}>
			<div className="nori-photo-wrap">
				<ProductOfferBadges product={product} />
				<ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="fcard-qty" />
				<FoodPhoto logic={logic} name={product.name} priority={priority} sizes={PHOTO_SIZES.tile} className="nori-photo" />
			</div>
			<div className="nori-body">
				<h3 className="nori-title">{product.name}</h3>
				{description ? <p className="nori-desc">{description}</p> : null}
				<div className="nori-foot">
					<ProductPriceBlock
						pricing={pricing}
						blockClassName="fcard-price"
						priceClassName="fcard-price__now"
						originalClassName="fcard-price__old"
					/>
					<div onClick={(e) => e.stopPropagation()}>
						<CardCartActions logic={logic} addClassName="fcard-add" stepperClassName="fcard-stepper" compact />
					</div>
				</div>
			</div>
		</article>
	);
});
