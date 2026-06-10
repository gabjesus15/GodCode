"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Plus, Minus, ShoppingBag } from "lucide-react";

import { useCart } from "../cart";
import { useCartStore } from "../cart/cart-store";
import { getCloudinaryOptimizedUrl } from "../utils/cloudinary";
import { formatCartMoney } from "../cart/utils/format-cart-money";

export interface ProductCardProduct {
  id: string;
  name: string | null;
  description?: string | null;
  image_url?: string | null;
  is_special?: boolean;
  has_discount?: boolean;
  discount_price?: number | null;
  price: number;
  category_id?: string | null;
}

export const PRODUCT_CARD_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";

/** Tamaños responsive para next/image según layout del grid */
export const PRODUCT_IMAGE_SIZES = {
  grid: "(max-width: 480px) 45vw, (max-width: 768px) 42vw, (max-width: 1024px) 28vw, 220px",
  horizontal: "(max-width: 640px) 42vw, (max-width: 1024px) 22vw, 200px",
  tall: "(max-width: 480px) 48vw, (max-width: 768px) 44vw, 260px",
} as const;

/** Proporción alto/ancho para recorte Cloudinary alineado al contenedor de cada layout */
export type LayoutImageAspect = "square" | "portrait" | "tall" | "landscape" | "wide";

const LAYOUT_ASPECT_HEIGHT_RATIO: Record<LayoutImageAspect, number> = {
  square: 1,
  portrait: 1.2,
  tall: 1.35,
  landscape: 0.85,
  wide: 0.75,
};

export function createLayoutCloudinaryLoader(aspect: LayoutImageAspect = "square") {
  const heightRatio = LAYOUT_ASPECT_HEIGHT_RATIO[aspect];
  return ({ src, width }: { src: string; width: number }) =>
    getCloudinaryOptimizedUrl(src, {
      width,
      height: Math.max(1, Math.round(width * heightRatio)),
      crop: "fill",
      gravity: "auto",
    }) || src;
}

export function truncateText(text: string | null | undefined, maxLength: number): string {
  const value = String(text ?? "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHydrated(true), 0);
    return () => clearTimeout(t);
  }, []);
  return hydrated;
}

/** Cantidad en carrito por producto — solo re-renderiza si cambia esta línea */
export function useProductCartQuantity(productId: string): number {
  return useCartStore((state) => {
    let total = 0;
    for (const item of state.cart) {
      if (item.id === productId) {
        total += Number(item.quantity) || 0;
      }
    }
    return total;
  });
}

export function useProductCardLogic(product: ProductCardProduct, country = "CL") {
  const { addToCart, decreaseQuantity, getPrice } = useCart();
  const quantity = useProductCartQuantity(product.id);
  const hydrated = useHydrated();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isCloudinary = Boolean(product.image_url?.includes("res.cloudinary.com"));
  const imageSrc = imageError
    ? PRODUCT_CARD_FALLBACK_IMAGE
    : isCloudinary
      ? product.image_url!
      : product.image_url || PRODUCT_CARD_FALLBACK_IMAGE;

  const cloudinaryLoader = useCallback(
    ({ src, width }: { src: string; width: number }) =>
      getCloudinaryOptimizedUrl(src, { width, crop: "fill", gravity: "auto" }) || src,
    [],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setImageLoaded(false);
      setImageError(false);
    }, 0);
    return () => clearTimeout(t);
  }, [product.id, product.image_url]);

  const handleAdd = useCallback(
    (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      addToCart(product);
    },
    [addToCart, product],
  );

  const handleDecrease = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      decreaseQuantity(product.id);
    },
    [decreaseQuantity, product.id],
  );

  const showUSD = country === "VE" || country === "Venezuela";
  const currencyCode = showUSD ? "USD" : undefined;

  return {
    quantity,
    hydrated,
    imageLoaded,
    setImageLoaded,
    imageError,
    setImageError,
    imageSrc,
    isCloudinary,
    cloudinaryLoader,
    handleAdd,
    handleDecrease,
    showUSD,
    getPrice,
    currencyCode,
  };
}

export type ProductCardLogic = ReturnType<typeof useProductCardLogic>;

export function useProductPricing(
  product: ProductCardProduct,
  currency: string,
  logic: ProductCardLogic,
  exchangeRate?: number | null,
) {
  return useMemo(() => {
    const effectiveCurrency = logic.showUSD ? "USD" : currency;
    const listPrice = Number(product.price) || 0;
    const salePrice = logic.getPrice(product);
    const hasDiscount =
      Boolean(product.has_discount) &&
      product.discount_price != null &&
      product.discount_price > 0 &&
      product.discount_price < listPrice;

    const format = (amount: number) => formatCartMoney(amount, effectiveCurrency);

    const getDualPrice = (priceVal: number) => {
      const primaryStr = format(priceVal);
      if (exchangeRate && exchangeRate > 0 && !logic.showUSD) {
        const localCode = (effectiveCurrency === "USD") ? "VES" : "USD";
        const convertedVal = priceVal * exchangeRate;
        return `${primaryStr} / ${formatCartMoney(convertedVal, localCode)}`;
      }
      return primaryStr;
    };

    return {
      listPrice,
      salePrice,
      hasDiscount,
      displayPrice: getDualPrice(salePrice),
      originalPrice: hasDiscount ? getDualPrice(listPrice) : null,
      effectiveCurrency,
    };
  }, [product, currency, logic, exchangeRate]);
}

type ProductCardImageProps = {
  src: string;
  alt: string;
  isCloudinary: boolean;
  cloudinaryLoader: ProductCardLogic["cloudinaryLoader"];
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  loaded: boolean;
  onLoaded: () => void;
  onError: () => void;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
  /** Recorte Cloudinary alineado al contenedor del layout (sustituye al loader genérico) */
  layoutLoader?: ProductCardLogic["cloudinaryLoader"];
};

export const ProductCardImage = React.memo(function ProductCardImage({
  src,
  alt,
  isCloudinary,
  cloudinaryLoader,
  priority = false,
  sizes = PRODUCT_IMAGE_SIZES.grid,
  className = "",
  imageClassName = "",
  loaded,
  onLoaded,
  onError,
  objectFit = "cover",
  objectPosition = "center",
  layoutLoader,
}: ProductCardImageProps) {
  const resolvedLoader = isCloudinary ? (layoutLoader ?? cloudinaryLoader) : undefined;

  return (
    <div className={`product-card-media ${className}`.trim()}>
      {!loaded ? <div className="skeleton-loader product-card-media__skeleton" aria-hidden /> : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        loader={resolvedLoader}
        unoptimized={!isCloudinary}
        onLoad={onLoaded}
        onError={onError}
        className={`product-card-media__img product-card-media__img--fill ${imageClassName} ${loaded ? "is-loaded" : "is-loading"}`.trim()}
        style={{ objectFit, objectPosition }}
      />
    </div>
  );
});

export const ProductQtyBadge = React.memo(function ProductQtyBadge({
  quantity,
  hydrated,
  className = "product-card-qty-badge",
}: {
  quantity: number;
  hydrated: boolean;
  className?: string;
}) {
  if (!hydrated || quantity <= 0) return null;
  return (
    <div className={className} aria-label={`${quantity} en el carrito`}>
      {quantity}
    </div>
  );
});

export function ProductOfferBadges({
  product,
  hotClassName = "layout-badge-hot",
  specialClassName = "layout-badge-special",
}: {
  product: ProductCardProduct;
  hotClassName?: string;
  specialClassName?: string;
}) {
  if (product.has_discount) {
    return <span className={hotClassName}>Oferta</span>;
  }
  if (product.is_special) {
    return <span className={specialClassName}>Especial</span>;
  }
  return null;
}

type CardCartActionsProps = {
  logic: ProductCardLogic;
  addClassName?: string;
  stepperClassName?: string;
  addLabel?: string;
  compact?: boolean;
  icon?: "plus" | "bag";
  disableStepper?: boolean;
};

export const CardCartActions = React.memo(function CardCartActions({
  logic,
  addClassName = "layout-add-btn",
  stepperClassName = "layout-stepper",
  addLabel = "Agregar",
  compact = false,
  icon = "plus",
  disableStepper = false,
}: CardCartActionsProps) {
  const { quantity, hydrated, handleAdd, handleDecrease } = logic;
  const showStepper = hydrated && quantity > 0 && !disableStepper;

  if (showStepper) {
    return (
      <div className={stepperClassName} onClick={(e) => e.stopPropagation()} role="group" aria-label="Cantidad en carrito">
        <button type="button" onClick={handleDecrease} aria-label="Quitar uno">
          <Minus size={compact ? 14 : 16} strokeWidth={2.5} />
        </button>
        <span aria-live="polite">{quantity}</span>
        <button type="button" onClick={handleAdd} aria-label="Agregar uno">
          <Plus size={compact ? 14 : 16} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  return (
    <button type="button" className={addClassName} onClick={handleAdd} aria-label="Agregar al carrito">
      {compact ? (
        icon === "bag" ? <ShoppingBag size={20} aria-hidden /> : <Plus size={20} strokeWidth={2.5} aria-hidden />
      ) : (
        addLabel
      )}
    </button>
  );
});

export function ProductPriceBlock({
  pricing,
  priceClassName = "layout-price",
  originalClassName = "layout-price-original",
  blockClassName = "layout-price-block",
}: {
  pricing: ReturnType<typeof useProductPricing>;
  priceClassName?: string;
  originalClassName?: string;
  blockClassName?: string;
}) {
  return (
    <div className={blockClassName}>
      {pricing.hasDiscount && pricing.originalPrice ? (
        <>
          <span className={originalClassName}>{pricing.originalPrice}</span>
          <span className={`${priceClassName} layout-price--sale`}>{pricing.displayPrice}</span>
        </>
      ) : (
        <span className={priceClassName}>{pricing.displayPrice}</span>
      )}
    </div>
  );
}
