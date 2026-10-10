"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCartStore } from "../cart/cart-store";
import { formatCartMoney } from "../cart/utils/format-cart-money";
import { safeImageSrc } from "../cart/utils/image-src";
import { shouldUnoptimizeImageSrc } from "@/lib/tenant/images/should-unoptimize-image";
import {
	MotionCount,
	TenantBadge,
	TenantButton,
	TenantOfferBadgeStack,
	TenantStepper,
	type TenantButtonVariant,
} from "./ui/tenant-ui";

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
  /** Tamaños con precio propio: al agregar se elige uno en la hoja de producto. */
  sizes?: ProductSizeOption[];
  /** Grupos de variantes (una opción por grupo): también se eligen en la hoja. */
  variants?: ProductVariantGroup[];
}

import { isVenezuelaCountry } from "@/lib/geo/venezuela";
import { minSizePrice, type ProductSizeOption } from "@/lib/tenant/product-sizes";
import { productNeedsConfiguration, type ProductVariantGroup } from "@/lib/tenant/product-variants";
import { useSizePickerStore } from "./product-size-store";

/** Tamaños responsive para next/image de la tarjeta en rejilla. */
export const PRODUCT_IMAGE_SIZES = {
  grid: "(max-width: 480px) 45vw, (max-width: 768px) 42vw, (max-width: 1024px) 28vw, 220px",
} as const;

export function truncateText(text: string | null | undefined, maxLength: number): string {
  const value = String(text ?? "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trimEnd()}…`;
}

const subscribeNoop = () => () => {};

/** false en el servidor y en la hidratación; true en cuanto React toma el DOM. */
function useHydrated() {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
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

export function getProductSalePrice(
  product: Pick<ProductCardProduct, "price" | "has_discount" | "discount_price" | "sizes">,
): number {
  // Con tamaños, la oferta del producto no aplica: se muestra el tamaño más barato.
  const fromSizes = minSizePrice(product.sizes);
  if (fromSizes != null) return fromSizes;
  if (
    product.has_discount &&
    typeof product.discount_price === "number" &&
    product.discount_price > 0
  ) {
    return product.discount_price;
  }
  return Number(product.price) || 0;
}

export function useProductCardLogic(product: ProductCardProduct, country = "CL") {
  const addToCart = useCartStore((state) => state.addToCart);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const openSizePicker = useSizePickerStore((state) => state.open);
  const quantity = useProductCartQuantity(product.id);
  const hydrated = useHydrated();
  // Identidad de la imagen: evita race donde un reset async borra un onLoad ya disparado (caché).
  const imageIdentity = `${product.id}::${product.image_url ?? ""}`;
  const [loadedFor, setLoadedFor] = useState("");
  const [errorFor, setErrorFor] = useState("");
  const imageError = errorFor === imageIdentity;
  const imageLoaded = loadedFor === imageIdentity;
  const getPrice = useCallback(
    (item: ProductCardProduct) => getProductSalePrice(item),
    [],
  );

  /**
   * Foto propia del producto, o null si no tiene una utilizable o no cargó. Sin ella cada
   * tarjeta (y la hoja) pinta la inicial (ProductPhotoFallback), nunca una foto de stock.
   */
  const imageSrc = imageError ? null : safeImageSrc(product.image_url);
  const hasPhoto = imageSrc !== null;

  const setImageLoaded = useCallback((_value: boolean | ((prev: boolean) => boolean) = true) => {
    // Callers always mark loaded=true; identity mismatch already means "not loaded".
    setLoadedFor(imageIdentity);
  }, [imageIdentity]);

  const setImageError = useCallback((_value: boolean | ((prev: boolean) => boolean) = true) => {
    setErrorFor(imageIdentity);
    setLoadedFor(imageIdentity); // quita skeleton aunque falle
  }, [imageIdentity]);

  const handleAdd = useCallback(
    (e: React.MouseEvent<HTMLButtonElement | HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      // Con tamaños o variantes no hay "agregar a ciegas": se abre la hoja de producto.
      if (productNeedsConfiguration(product)) {
        openSizePicker(product);
        return;
      }
      addToCart?.(product);
    },
    [addToCart, openSizePicker, product],
  );

  const handleDecrease = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      e.preventDefault();
      decreaseQuantity?.(product.id);
    },
    [decreaseQuantity, product.id],
  );

  const showUSD = isVenezuelaCountry(country);
  const currencyCode = showUSD ? "USD" : undefined;

  // Mismo objeto mientras nada cambie: las tarjetas son memo() y reciben `logic`
  // como prop; un objeto nuevo en cada render las re-renderizaba todas a la vez.
  return useMemo(
    () => ({
      quantity,
      hydrated,
      imageLoaded,
      setImageLoaded,
      imageError,
      setImageError,
      imageSrc,
      hasPhoto,
      imageIdentity,
      handleAdd,
      handleDecrease,
      showUSD,
      getPrice,
      currencyCode,
    }),
    [
      quantity,
      hydrated,
      imageLoaded,
      setImageLoaded,
      imageError,
      setImageError,
      imageSrc,
      hasPhoto,
      imageIdentity,
      handleAdd,
      handleDecrease,
      showUSD,
      getPrice,
      currencyCode,
    ],
  );
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
    const fromSizes = minSizePrice(product.sizes);
    const fromPrice = fromSizes != null;
    const listPrice = fromSizes ?? (Number(product.price) || 0);
    const salePrice = logic.getPrice(product);
    const hasDiscount =
      !fromPrice &&
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
      /** true: el producto tiene tamaños y `displayPrice` es el del más barato ("Desde"). */
      fromPrice,
      formatPrice: getDualPrice,
      effectiveCurrency,
    };
  }, [product, currency, logic, exchangeRate]);
}

type ProductCardImageProps = {
  src: string;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  imageClassName?: string;
  /**
   * Opcional: sin él la imagen lleva su propio estado de carga y, al llegar la
   * foto, solo se re-renderiza ella (no la tarjeta entera). Con scroll rápido
   * llegan decenas juntas y re-renderizar cada tarjeta daba tirones.
   */
  loaded?: boolean;
  onLoaded?: () => void;
  onError: () => void;
  objectFit?: "cover" | "contain";
  objectPosition?: string;
};

export const ProductCardImage = React.memo(function ProductCardImage({
  src,
  alt,
  priority = false,
  sizes = PRODUCT_IMAGE_SIZES.grid,
  className = "",
  imageClassName = "",
  loaded,
  onLoaded,
  onError,
  objectFit = "cover",
  objectPosition = "center",
}: ProductCardImageProps) {
  const mediaRef = useRef<HTMLDivElement>(null);
  const controlled = loaded !== undefined;

  // `onLoaded`/`onError` ya vienen memoizados por identidad de imagen desde
  // useProductCardLogic: no hace falta esconderlos en refs. Sin `loaded` (modo
  // libre) no hay estado de React: marcar el contenedor basta para que el CSS
  // quite el esqueleto, y llegar la foto no cuesta ningún render.
  const markLoaded = useCallback(() => {
    mediaRef.current?.setAttribute("data-loaded", "");
    onLoaded?.();
  }, [onLoaded]);

  // Timeout de seguridad: si el evento no llega (Safari + lazy), quitar skeleton.
  useEffect(() => {
    if (loaded) return;
    const timer = window.setTimeout(() => {
      if (!controlled && mediaRef.current?.hasAttribute("data-loaded")) return;
      markLoaded();
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [src, loaded, controlled, markLoaded]);

  const stateClass = controlled ? (loaded ? "is-loaded" : "is-loading") : "";

  return (
    // key por src: otra foto es otro contenedor, sin el data-loaded de la anterior.
    <div key={src} ref={mediaRef} className={`product-card-media ${className}`.trim()}>
      {!loaded ? <div className="skeleton-loader product-card-media__skeleton" aria-hidden /> : null}
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={75}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        unoptimized={shouldUnoptimizeImageSrc(src)}
        onLoad={markLoaded}
        onError={onError}
        className={`product-card-media__img product-card-media__img--fill ${imageClassName} ${stateClass}`.replace(/\s+/g, " ").trim()}
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
	const t = useTranslations("tenant.menu");
	if (!hydrated || quantity <= 0) return null;
	return (
		<TenantBadge variant="default" className={className} aria-label={t("card.inCart", { count: quantity })}>
			<MotionCount value={quantity} />
		</TenantBadge>
	);
});

export function ProductOfferBadges({
	product,
}: {
	product: ProductCardProduct;
	hotClassName?: string;
	specialClassName?: string;
}) {
	const t = useTranslations("tenant.menu");
	const hasDiscount = Boolean(product.has_discount);
	const isSpecial = Boolean(product.is_special);

	if (!hasDiscount && !isSpecial) return null;

	return (
		<TenantOfferBadgeStack>
			{/* Una sola etiqueta: si está rebajado, «Oferta» ya lo destaca. */}
			{hasDiscount ? (
				<TenantBadge variant="destructive">{t("card.offer")}</TenantBadge>
			) : (
				<TenantBadge variant="special">{t("card.special")}</TenantBadge>
			)}
		</TenantOfferBadgeStack>
	);
}

type CardCartActionsProps = {
	logic: ProductCardLogic;
	addClassName?: string;
	stepperClassName?: string;
	addLabel?: string;
	compact?: boolean;
	icon?: "plus" | "bag";
	addVariant?: TenantButtonVariant;
};

export const CardCartActions = React.memo(function CardCartActions({
	logic,
	addClassName = "layout-add-btn",
	stepperClassName = "layout-stepper",
	addLabel,
	compact = false,
	icon = "plus",
	addVariant,
}: CardCartActionsProps) {
	const t = useTranslations("tenant.menu");
	const { quantity, hydrated, handleAdd, handleDecrease } = logic;
	const showStepper = hydrated && quantity > 0;
	const resolvedVariant = addVariant ?? (compact ? "outline" : "default");

	if (showStepper) {
		return (
			<TenantStepper
				quantity={quantity}
				onDecrease={handleDecrease}
				onIncrease={handleAdd}
				className={stepperClassName}
				compact={compact}
			/>
		);
	}

	return (
		<TenantButton
			variant={resolvedVariant}
			size={compact ? "icon" : "default"}
			className={addClassName}
			onClick={handleAdd}
			aria-label={t("card.addToCart")}
		>
			{compact ? (
				icon === "bag" ? <ShoppingBag size={18} aria-hidden /> : <PlusGlyph size={18} />
			) : (
				addLabel ?? t("card.add")
			)}
		</TenantButton>
	);
});

function PlusGlyph({ size }: { size: number }) {
	return (
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
			<path d="M12 5v14M5 12h14" strokeLinecap="round" />
		</svg>
	);
}

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
      {pricing.fromPrice ? <FromPriceLabel /> : null}
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

/** "Desde" delante del precio de un producto con tamaños. */
export function FromPriceLabel({ className = "layout-price-from" }: { className?: string }) {
	const t = useTranslations("tenant.menu");
	return <span className={className}>{t("card.from")} </span>;
}
