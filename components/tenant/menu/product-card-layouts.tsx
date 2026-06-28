"use client";

import React from "react";
import { Heart, Info, Plus } from "lucide-react";

import {
  CardCartActions,
  ProductCardImage,
  ProductOfferBadges,
  ProductPriceBlock,
  ProductQtyBadge,
  PRODUCT_IMAGE_SIZES,
  createLayoutCloudinaryLoader,
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
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  exchangeRate?: number | null;
};

const onImageError = (logic: ProductCardLogic) => {
  logic.setImageError(true);
  logic.setImageLoaded(true);
};

/** Zapatillas — pestaña vertical + imagen cover */
export const CleanCard = React.memo(function CleanCard({ product, logic, currency, priority, exchangeRate }: LayoutCardProps) {
  const pricing = useProductPricing(product, currency, logic, exchangeRate);

  return (
    <article className="product-layout-clean card">
      <div className="card__img">
        <ProductOfferBadges product={product} hotClassName="layout-badge-hot" specialClassName="layout-badge-special" />
        <ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="clean-qty-badge" />
        <ProductCardImage
          src={logic.imageSrc}
          alt={product.name ?? "Producto"}
          isCloudinary={logic.isCloudinary}
          cloudinaryLoader={logic.cloudinaryLoader}
          layoutLoader={createLayoutCloudinaryLoader("tall")}
          priority={priority}
          sizes={PRODUCT_IMAGE_SIZES.tall}
          imageClassName="clean-img"
          objectPosition="center center"
          loaded={logic.imageLoaded}
          onLoaded={() => logic.setImageLoaded(true)}
          onError={() => onImageError(logic)}
        />
      </div>
      <div className="card__name">
        <p>{truncateText(product.name, 32)}</p>
      </div>
      <div className="card__precis">
        <ProductPriceBlock
          pricing={pricing}
          blockClassName="card__price-wrap"
          priceClassName="card__preci card__preci--now"
          originalClassName="card__preci card__preci--old"
        />
        <CardCartActions
          logic={logic}
          addClassName="card__icon card__cart-btn"
          stepperClassName="card__stepper"
          compact
          icon="bag"
        />
      </div>
    </article>
  );
});

/** Tecnología — imagen cuadrada + ficha detallada */
export const DetailedCard = React.memo(function DetailedCard({ product, logic, currency, priority, exchangeRate }: LayoutCardProps) {
  const pricing = useProductPricing(product, currency, logic, exchangeRate);
  const description = truncateText(product.description, 120);

  return (
    <article className="product-layout-detailed">
      <div className="detailed-image-container">
        <ProductOfferBadges product={product} hotClassName="layout-badge-hot" specialClassName="layout-badge-special" />
        <ProductCardImage
          src={logic.imageSrc}
          alt={product.name ?? "Producto"}
          isCloudinary={logic.isCloudinary}
          cloudinaryLoader={logic.cloudinaryLoader}
          layoutLoader={createLayoutCloudinaryLoader("square")}
          priority={priority}
          sizes={PRODUCT_IMAGE_SIZES.grid}
          imageClassName="detailed-img"
          objectPosition="center center"
          loaded={logic.imageLoaded}
          onLoaded={() => logic.setImageLoaded(true)}
          onError={() => onImageError(logic)}
        />
      </div>
      <div className="detailed-info">
        <h3 className="detailed-title">{product.name}</h3>
        {description ? <p className="detailed-desc">{description}</p> : null}
        <div className="detailed-price-row">
          <ProductPriceBlock
            pricing={pricing}
            blockClassName="detailed-prices"
            priceClassName="detailed-new-price"
            originalClassName="detailed-old-price"
          />
          <CardCartActions
            logic={logic}
            addClassName="detailed-add-btn"
            stepperClassName="detailed-stepper"
            addLabel="Agregar"
          />
        </div>
      </div>
    </article>
  );
});

/** Horizontal — imagen lateral */
export const HorizontalCard = React.memo(function HorizontalCard({ product, logic, currency, priority, exchangeRate }: LayoutCardProps) {
  const pricing = useProductPricing(product, currency, logic, exchangeRate);
  const description = truncateText(product.description, 100);

  return (
    <article className="product-layout-horizontal">
      <div className="horizontal-image-container">
        <ProductOfferBadges product={product} hotClassName="layout-badge-hot" specialClassName="layout-badge-special" />
        <ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="horizontal-qty-badge" />
        <ProductCardImage
          src={logic.imageSrc}
          alt={product.name ?? "Producto"}
          isCloudinary={logic.isCloudinary}
          cloudinaryLoader={logic.cloudinaryLoader}
          layoutLoader={createLayoutCloudinaryLoader("landscape")}
          priority={priority}
          sizes={PRODUCT_IMAGE_SIZES.horizontal}
          imageClassName="horizontal-img"
          objectPosition="center center"
          loaded={logic.imageLoaded}
          onLoaded={() => logic.setImageLoaded(true)}
          onError={() => onImageError(logic)}
        />
      </div>
      <div className="horizontal-info">
        <h3 className="horizontal-title">{product.name}</h3>
        <ProductPriceBlock pricing={pricing} priceClassName="horizontal-price" blockClassName="horizontal-price-block" />
        {description ? <p className="horizontal-desc">{description}</p> : null}
        <div className="horizontal-actions">
          <CardCartActions
            logic={logic}
            addClassName="horizontal-add-btn"
            stepperClassName="horizontal-stepper"
            addLabel="Agregar"
          />
        </div>
      </div>
    </article>
  );
});

/** Moda — panel lateral al hover */
export const SidebarCard = React.memo(function SidebarCard({ product, logic, currency, priority, exchangeRate }: LayoutCardProps) {
  const pricing = useProductPricing(product, currency, logic, exchangeRate);
  const description = truncateText(product.description, 80);

  return (
    <article className="product-layout-sidebar group">
      <div className="sidebar-image-container">
        <ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="sidebar-qty-badge" />
        <ProductCardImage
          src={logic.imageSrc}
          alt={product.name ?? "Producto"}
          isCloudinary={logic.isCloudinary}
          cloudinaryLoader={logic.cloudinaryLoader}
          layoutLoader={createLayoutCloudinaryLoader("portrait")}
          priority={priority}
          sizes={PRODUCT_IMAGE_SIZES.tall}
          imageClassName="sidebar-img"
          objectPosition="center top"
          loaded={logic.imageLoaded}
          onLoaded={() => logic.setImageLoaded(true)}
          onError={() => onImageError(logic)}
        />
        <div className="sidebar-actions-panel" onClick={(e) => e.stopPropagation()}>
          <CardCartActions
            logic={logic}
            addClassName="sidebar-btn"
            stepperClassName="sidebar-stepper-col"
            compact
            icon="bag"
          />
          <button type="button" className="sidebar-btn tooltip-parent" aria-label="Más información">
            <Info size={18} />
            <span className="tooltip">Info</span>
          </button>
          <button type="button" className="sidebar-btn" aria-label="Favorito">
            <Heart size={18} />
          </button>
        </div>
      </div>
      <div className="sidebar-info">
        <div>
          <h3 className="sidebar-title">{product.name}</h3>
          {description ? <p className="sidebar-desc">{description}</p> : null}
        </div>
        <ProductPriceBlock pricing={pricing} priceClassName="sidebar-price" blockClassName="sidebar-price-block" />
      </div>
    </article>
  );
});

/** Rappi — minimal delivery */
export const RappiCard = React.memo(function RappiCard({ product, logic, currency, priority, exchangeRate }: LayoutCardProps) {
  const pricing = useProductPricing(product, currency, logic, exchangeRate);
  const description = truncateText(product.description, 64);

  return (
    <article className="product-layout-rappi">
      <div className="rappi-image-container">
        <ProductOfferBadges product={product} hotClassName="rappi-badge layout-badge-hot" specialClassName="rappi-badge layout-badge-special" />
        <ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="rappi-qty-badge" />
        <ProductCardImage
          src={logic.imageSrc}
          alt={product.name ?? "Producto"}
          isCloudinary={logic.isCloudinary}
          cloudinaryLoader={logic.cloudinaryLoader}
          layoutLoader={createLayoutCloudinaryLoader("wide")}
          priority={priority}
          sizes={PRODUCT_IMAGE_SIZES.grid}
          imageClassName="rappi-img"
          objectPosition="center center"
          loaded={logic.imageLoaded}
          onLoaded={() => logic.setImageLoaded(true)}
          onError={() => onImageError(logic)}
        />
      </div>
      <div className="rappi-info">
        <div className="rappi-text-col">
          <h3 className="rappi-title">{product.name}</h3>
          {description ? <p className="rappi-desc">{description}</p> : null}
          <ProductPriceBlock pricing={pricing} priceClassName="rappi-price" blockClassName="rappi-price-block" />
        </div>
        <div className="rappi-actions">
          <CardCartActions logic={logic} addClassName="rappi-add-btn" stepperClassName="rappi-stepper" compact disableStepper />
        </div>
      </div>
    </article>
  );
});

/** Sneaker — hero con monograma */
export const SneakerCard = React.memo(function SneakerCard({ product, logic, currency, priority, exchangeRate }: LayoutCardProps) {
  const pricing = useProductPricing(product, currency, logic, exchangeRate);
  const subtitle = truncateText(product.description, 72);
  const monogram = (product.name ?? "PRO").slice(0, 3).toUpperCase();

  return (
    <article className="product-layout-sneaker">
      <div className="sneaker-head">
        <span className="sneaker-back-text" aria-hidden>
          {monogram}
        </span>
        <div className="sneaker-img-wrapper">
          <ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="sneaker-qty-badge" />
          <ProductCardImage
            src={logic.imageSrc}
            alt={product.name ?? "Producto"}
            isCloudinary={logic.isCloudinary}
            cloudinaryLoader={logic.cloudinaryLoader}
            layoutLoader={createLayoutCloudinaryLoader("tall")}
            priority={priority}
            sizes={PRODUCT_IMAGE_SIZES.tall}
            imageClassName="sneaker-img"
            objectPosition="center bottom"
            loaded={logic.imageLoaded}
            onLoaded={() => logic.setImageLoaded(true)}
            onError={() => onImageError(logic)}
          />
        </div>
        <div className="sneaker-detail">
          <h2>{product.name}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      </div>
      <div className="sneaker-body">
        <div className="sneaker-footer">
          <ProductPriceBlock
            pricing={pricing}
            priceClassName="sneaker-price-label"
            originalClassName="sneaker-price-old"
            blockClassName="sneaker-price-block"
          />
          {logic.hydrated && logic.quantity > 0 ? (
            <CardCartActions logic={logic} addClassName="sneaker-add-btn" stepperClassName="sneaker-stepper" compact />
          ) : (
            <button type="button" className="sneaker-add-btn" onClick={logic.handleAdd} aria-label="Agregar al carrito">
              <Plus size={18} strokeWidth={2.5} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </article>
  );
});

/** Gaming — skew accent */
export const SkewCard = React.memo(function SkewCard({ product, logic, currency, priority, exchangeRate }: LayoutCardProps) {
  const pricing = useProductPricing(product, currency, logic, exchangeRate);
  const backgroundText = (product.name || "PRODUCTO").split(/\s+/)[0]?.toUpperCase() ?? "ITEM";

  return (
    <article className="product-layout-skew card">
      <div className="skew-bg-text" aria-hidden>
        {backgroundText}
      </div>
      <div className="imgBox">
        <ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="skew-qty-badge" />
        <ProductCardImage
          src={logic.imageSrc}
          alt={product.name ?? "Producto"}
          isCloudinary={logic.isCloudinary}
          cloudinaryLoader={logic.cloudinaryLoader}
          layoutLoader={createLayoutCloudinaryLoader("portrait")}
          priority={priority}
          sizes={PRODUCT_IMAGE_SIZES.tall}
          imageClassName="skew-img"
          objectPosition="center center"
          loaded={logic.imageLoaded}
          onLoaded={() => logic.setImageLoaded(true)}
          onError={() => onImageError(logic)}
        />
      </div>
      <div className="contentBox">
        <h3 className="skew-title">{product.name ?? "Producto"}</h3>
        <p className="price">{pricing.displayPrice}</p>
        <CardCartActions logic={logic} addClassName="buy skew-btn" stepperClassName="skew-stepper" addLabel="Agregar" />
      </div>
    </article>
  );
});

/** Food Deluxe — copia 1 a 1 de comida con gradiente dinámico y botones blanco/negro */
export const FoodCard = React.memo(function FoodCard({ product, logic, currency, priority, onClick, isFavorite = false, onToggleFavorite, exchangeRate }: LayoutCardProps) {
  const pricing = useProductPricing(product, currency, logic, exchangeRate);

  // Hash stable index to pick a gradient color based on product ID
  const stableIndex = React.useMemo(() => {
    const idStr = String(product.id || "");
    let sum = 0;
    for (let i = 0; i < idStr.length; i++) {
      sum += idStr.charCodeAt(i);
    }
    return sum % 5;
  }, [product.id]);

  const gradientStyle = React.useMemo(() => {
    const gradients = [
      "radial-gradient(125% 110% at top right, #38a192 8%, rgba(22,34,32,0.85) 100%)",
      "radial-gradient(125% 110% at top right, #b54638 8%, rgba(41,18,16,0.85) 100%)",
      "radial-gradient(125% 110% at top right, #3b5cb8 8%, rgba(18,22,38,0.85) 100%)",
      "radial-gradient(125% 110% at top right, #b8863b 8%, rgba(38,26,12,0.85) 100%)",
      "radial-gradient(125% 110% at top right, #8b3bb8 8%, rgba(29,13,38,0.85) 100%)",
    ];
    return { background: gradients[stableIndex] };
  }, [stableIndex]);

  const bgRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (bgRef.current) {
      bgRef.current.style.background = gradientStyle.background;
    }
  }, [gradientStyle]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onClick) onClick();
    }
  }, [onClick]);

  return (
    <div
      className="product-layout-food"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={product.name ?? "Ver producto"}
      onKeyDown={handleKeyDown}
    >
      <div className="food-card-bg" ref={bgRef} />
      <button
        type="button"
        className={`food-favorite-btn ${isFavorite ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          if (onToggleFavorite) onToggleFavorite();
        }}
        aria-label="Agregar a favoritos"
      >
        <Heart size={16} fill={isFavorite ? "#ffffff" : "none"} stroke="#ffffff" strokeWidth={2.2} />
      </button>

      <ProductQtyBadge quantity={logic.quantity} hydrated={logic.hydrated} className="food-qty-badge" />

      <div className="food-image-wrapper">
        <ProductCardImage
          src={logic.imageSrc}
          alt={product.name ?? "Producto"}
          isCloudinary={logic.isCloudinary}
          cloudinaryLoader={logic.cloudinaryLoader}
          layoutLoader={createLayoutCloudinaryLoader("square")}
          priority={priority}
          sizes={PRODUCT_IMAGE_SIZES.grid}
          imageClassName="food-img"
          objectPosition="center center"
          loaded={logic.imageLoaded}
          onLoaded={() => logic.setImageLoaded(true)}
          onError={() => onImageError(logic)}
          objectFit="cover"
        />
      </div>

      <div className="food-info">
        <h3 className="food-title" title={product.name || undefined}>
          {product.name ? product.name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : ''}
        </h3>
        
        <div className="food-price-section">
          <span className="food-starting-from">Starting from</span>
          <ProductPriceBlock
            pricing={pricing}
            blockClassName="food-price-row"
            priceClassName="food-price"
            originalClassName="food-old-price"
          />
        </div>
      </div>

      <div className="food-action-wrapper" onClick={(e) => e.stopPropagation()}>
        <CardCartActions
          logic={logic}
          addClassName="food-add-btn"
          stepperClassName="food-stepper"
          compact
          icon="plus"
          disableStepper
        />
      </div>
    </div>
  );
});
