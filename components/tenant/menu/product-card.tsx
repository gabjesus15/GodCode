import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Plus, ChevronDown, X } from "lucide-react";
import { useCartStore } from "../cart/cart-store";
import { formatCartMoney } from "../cart/utils/format-cart-money";
import { normalizeProductCardStyle } from "@/lib/store-theme/theme-config";
import {
  ProductOfferBadges,
  ProductQtyBadge,
  useProductCardLogic,
  useProductCartQuantity,
  type ProductCardProduct,
  type ProductCardLogic,
} from "./product-card-shared";
import { TenantButton, TenantStepper } from "./ui/tenant-ui";
import {
  CleanCard,
  DetailedCard,
  FoodCard,
  HorizontalCard,
  RappiCard,
  SidebarCard,
  SkewCard,
  SneakerCard,
} from "./product-card-layouts";

type ProductType = ProductCardProduct;

// -----------------------------------------------------------------------------
// LAYOUT 0: Original (Glass)
// -----------------------------------------------------------------------------
const GlassCard = React.memo(function GlassCard({ product, logic, priority = false, country = "CL", currency = "CLP", detailsMode = "modal-premium", onClick, onProductClick, inlineDetails = false, exchangeRate }: { product: ProductType; logic: ProductCardLogic; priority?: boolean; country?: string; currency?: string; detailsMode?: string; onClick?: () => void; onProductClick?: (productId: string) => void; inlineDetails?: boolean; exchangeRate?: number | null }) {
  const addToCart = useCartStore((state) => state.addToCart);
  const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
  const quantity = useProductCartQuantity(product.id);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isBumping, setIsBumping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Evitamos el warning del linter sobre llamar setState síncronamente en un effect
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  const CLOSE_ANIMATION_MS = 220;

  const isLongDesc = (product.description || "").length > 60;
  const showDetailsHint = Boolean(onProductClick || onClick) && (inlineDetails || isLongDesc || detailsMode === "modal-premium");
  const detailsHintLabel = detailsMode === "modal-premium" ? "Ver producto" : "Ver detalles";

  const closeDetails = useCallback(() => {
    if (!isExpanded || isClosing) return;
    setIsClosing(true);
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsExpanded(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);
  }, [isClosing, isExpanded]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleAdd = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    addToCart?.(product);
    setIsBumping(true);
    setTimeout(() => setIsBumping(false), 200);
  }, [addToCart, product]);

  const handleDecrease = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    decreaseQuantity?.(product.id);
  }, [decreaseQuantity, product.id]);

  const isClickableForDetails = !!(onProductClick || onClick || isLongDesc || inlineDetails);

  const toggleExpand = useCallback(() => {
    if (onProductClick) {
      onProductClick(product.id);
      return;
    }
    if (onClick) {
      onClick();
      return;
    }
    if (!isLongDesc && !inlineDetails) return;
    if (isExpanded) {
      closeDetails();
      return;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsClosing(false);
    setIsExpanded(true);
  }, [closeDetails, inlineDetails, isExpanded, isLongDesc, onClick, onProductClick, product.id]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpand();
    }
  };

  const showUSD = country === 'VE' || country === 'Venezuela';

  const formatPrice = (priceVal: number) => {
    const primaryStr = showUSD
      ? formatCartMoney(priceVal, "USD")
      : formatCartMoney(priceVal, currency);
    if (exchangeRate && exchangeRate > 0 && !showUSD) {
      const localCode = (currency === "USD" || showUSD) ? "VES" : "USD";
      const convertedVal = priceVal * exchangeRate;
      return `${primaryStr} / ${formatCartMoney(convertedVal, localCode)}`;
    }
    return primaryStr;
  };

  return (
    <div
      className={`product-card glass tenant-ui-card ${(isExpanded || isClosing) ? "is-viewing-info" : ""} ${isClickableForDetails ? "cursor-pointer" : "cursor-default"}`}
      onClick={isClickableForDetails ? toggleExpand : undefined}
      {...(isClickableForDetails ? { role: "button" } : {})}
      tabIndex={isClickableForDetails ? 0 : -1}
      onKeyDown={isClickableForDetails ? handleKeyDown : undefined}
      {...(isLongDesc || inlineDetails ? { 'aria-expanded': isExpanded } : {})}
      aria-label={`Ver detalles de ${product.name}`}
    >
      <div className={`product-image ${isBumping ? "bump-active" : ""}`}>
        {!logic.imageLoaded ? <div className="skeleton-loader absolute inset-0 z-[1] pointer-events-none" /> : null}
        <Image
          key={logic.imageSrc}
          src={logic.imageSrc}
          alt={product.name ?? "Producto"}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          quality={75}
          priority={priority}
          onLoad={() => logic.setImageLoaded(true)}
          onLoadingComplete={() => logic.setImageLoaded(true)}
          className="opacity-100 transition-opacity duration-500"
          onError={() => logic.setImageError(true)}
        />

        <ProductOfferBadges product={product} />

        <ProductQtyBadge quantity={quantity} hydrated={mounted} className="qty-badge-overlay animate-bounce-in" />
      </div>

      <div className="product-info">
        <div className="info-content-wrapper">
          {!isExpanded ? (
            <>
              <h3 className="product-name">{product.name}</h3>
              <p className="product-desc-clamped">{product.description}</p>
            </>
          ) : isExpanded || isClosing ? (
            <div className={`product-desc-scrollable ${isClosing ? "is-closing" : "is-opening"}`} onClick={(e) => e.stopPropagation()}>
              <div className="desc-header">
                <span>Detalles</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeDetails(); }}
                  className="btn-icon-sm"
                  aria-label="Cerrar detalles"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="glass-expand-title">{product.name}</p>
              <div className="scroll-area">
                <p className="glass-expand-desc">{product.description}</p>
              </div>
            </div>
          ) : null}
        </div>

        {(showDetailsHint) && !isExpanded && !isClosing && (
          <div className="info-hint">
            <ChevronDown size={14} /> {detailsHintLabel}
          </div>
        )}

        <div className="product-footer" onClick={(e) => e.stopPropagation()}>
          <div className={`price-container ${product.has_discount ? "has-discount" : ""}`}>
            {product.has_discount && product.discount_price ? (
              <>
                <span className="product-price discounted">
                  {formatPrice(product.discount_price)}
                </span>
                <span className="product-price original">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="product-price">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          {(!mounted || quantity === 0) ? (
            <TenantButton
              variant="default"
              className="btn-add"
              onClick={handleAdd}
              aria-label={`Agregar ${product.name} al carrito`}
            >
              <Plus size={18} />
              <span>Agregar</span>
            </TenantButton>
          ) : (
            <TenantStepper
              quantity={quantity}
              onDecrease={handleDecrease}
              onIncrease={handleAdd}
              className="stepper-control animate-fade"
            />
          )}
        </div>
      </div>
    </div>
  );
});

// -----------------------------------------------------------------------------
// MAIN EXPORT
// -----------------------------------------------------------------------------
export const ProductCard = React.memo(function ProductCard({ 
  product, 
  priority = false, 
  country = "CL", 
  currency = "CLP", 
  cardStyle = "layout-clean",
  detailsMode = "modal-premium",
  onClick,
  onProductClick,
  inlineDetails = false,
  exchangeRate
}: { 
  product: ProductType; 
  priority?: boolean; 
  country?: string; 
  currency?: string; 
  cardStyle?: string;
  detailsMode?: string;
  onClick?: () => void;
  onProductClick?: (productId: string) => void;
  inlineDetails?: boolean;
  exchangeRate?: number | null;
}) {
  const logic = useProductCardLogic(product, country);
  const resolvedStyle = normalizeProductCardStyle(cardStyle);

  const stableProductClick = useCallback(() => {
    onProductClick?.(product.id);
  }, [onProductClick, product.id]);

  const layoutProps = {
    product,
    logic,
    currency,
    priority,
    onClick: onProductClick ? stableProductClick : onClick,
    detailsMode,
    exchangeRate,
  };

  switch (resolvedStyle) {
    case "glass":
      return <GlassCard product={product} logic={logic} currency={currency} priority={priority} country={country} detailsMode={detailsMode} onClick={onClick} onProductClick={onProductClick} inlineDetails={inlineDetails} exchangeRate={exchangeRate} />;
    case "layout-detailed":
      return <DetailedCard {...layoutProps} />;
    case "layout-horizontal":
      return <HorizontalCard {...layoutProps} />;
    case "layout-sidebar":
      return <SidebarCard {...layoutProps} />;
    case "layout-rappi":
      return <RappiCard {...layoutProps} />;
    case "layout-sneaker":
      return <SneakerCard {...layoutProps} />;
    case "layout-skew":
      return <SkewCard {...layoutProps} />;
    case "layout-food":
      return <FoodCard {...layoutProps} />;
    case "layout-clean":
    default:
      return <CleanCard {...layoutProps} />;
  }
});
