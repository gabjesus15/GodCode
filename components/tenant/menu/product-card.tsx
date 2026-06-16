import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { Plus, Minus, ChevronDown, X } from "lucide-react";
import { useCart } from "../cart";
import { getCloudinaryOptimizedUrl, isCloudinaryUrl } from "../utils/cloudinary";
import { formatCartMoney } from "../cart/utils/format-cart-money";
import { normalizeProductCardStyle } from "@/lib/store-theme/theme-config";
import {
  PRODUCT_CARD_FALLBACK_IMAGE,
  useProductCardLogic,
  type ProductCardProduct,
} from "./product-card-shared";
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

const FALLBACK_IMAGE = PRODUCT_CARD_FALLBACK_IMAGE;

// -----------------------------------------------------------------------------
// LAYOUT 0: Original (Glass)
// -----------------------------------------------------------------------------
const GlassCard = React.memo(function GlassCard({ product, priority = false, country = "CL", currency = "CLP", onClick, exchangeRate }: { product: ProductType; priority?: boolean; country?: string; currency?: string; onClick?: () => void; exchangeRate?: number | null }) {
  const { cart, addToCart, decreaseQuantity } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBumping, setIsBumping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Evitamos el warning del linter sobre llamar setState síncronamente en un effect
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);
  const CLOSE_ANIMATION_MS = 220;

  const quantity = useMemo(
    () =>
      cart.reduce(
        (sum: number, item: { id: string; quantity: number }) =>
          item.id === product.id ? sum + (Number(item.quantity) || 0) : sum,
        0,
      ),
    [cart, product.id],
  );

  const isLongDesc = (product.description || "").length > 60;
  const isCloudinary = isCloudinaryUrl(product.image_url);
  const fallbackUrl = product.image_url || FALLBACK_IMAGE;

  const cloudinaryLoader = ({ src, width }: { src: string; width: number }) => {
    return getCloudinaryOptimizedUrl(src, { width, crop: "fill", gravity: "auto" }) || src;
  };

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
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isExpanded && !isClosing) {
      timer = setTimeout(() => {
        closeDetails();
      }, 8000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [closeDetails, isClosing, isExpanded]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleAdd = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    addToCart(product);
    setIsBumping(true);
    setTimeout(() => setIsBumping(false), 200);
  }, [addToCart, product]);

  const handleDecrease = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    decreaseQuantity(product.id);
  }, [decreaseQuantity, product.id]);

  const toggleExpand = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }
    if (!isLongDesc) return;
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
  }, [closeDetails, isExpanded, isLongDesc, onClick]);

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
      className={`product-card glass ${(isExpanded || isClosing) ? "is-viewing-info" : ""} ${!isLongDesc ? "cursor-default" : "cursor-pointer"}`}
      onClick={toggleExpand}
      {...(isLongDesc ? { role: "button" } : {})}
      tabIndex={isLongDesc ? 0 : -1}
      onKeyDown={isLongDesc ? handleKeyDown : undefined}
      {...(isLongDesc ? { 'aria-expanded': isExpanded } : {})}
      aria-label={`Ver detalles de ${product.name}`}
    >
      <div className={`product-image ${isBumping ? "bump-active" : ""}`}>
        {!imageLoaded ? <div className="skeleton-loader absolute inset-0" /> : null}
        <Image
          src={isCloudinary ? product.image_url! : fallbackUrl}
          alt={product.name ?? "Producto"}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          priority={priority}
          loader={isCloudinary ? cloudinaryLoader : undefined}
          unoptimized={!isCloudinary}
          onLoad={() => setImageLoaded(true)}
          className={!imageLoaded ? "opacity-0" : "opacity-100 transition-opacity duration-500"}
          onError={() => setImageLoaded(true)}
        />

        {product.is_special && <span className="badge-special">ESPECIAL</span>}
        {product.has_discount && <span className="badge-discount">OFERTA</span>}

        {mounted && quantity > 0 && (
          <div className="qty-badge-overlay animate-bounce-in">{quantity}</div>
        )}
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
              <div className="scroll-area">
                <p>{product.description}</p>
              </div>
            </div>
          ) : null}
        </div>

        {isLongDesc && !isExpanded && !isClosing && (
          <div className="info-hint">
            <ChevronDown size={14} /> Ver detalles
          </div>
        )}

        <div className="product-footer">
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
            <button
              onClick={handleAdd}
              className="btn-add"
              aria-label={`Agregar ${product.name} al carrito`}
            >
              <Plus size={18} />
              <span>Agregar</span>
            </button>
          ) : (
            <div className="stepper-control animate-fade" onClick={e => e.stopPropagation()}>
              <button onClick={handleDecrease} className="step-btn minus" aria-label="Disminuir cantidad">
                <Minus size={16} />
              </button>
              <span className="step-count">{quantity}</span>
              <button onClick={handleAdd} className="step-btn plus" aria-label="Aumentar cantidad">
                <Plus size={16} />
              </button>
            </div>
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
  onClick,
  isFavorite = false,
  onToggleFavorite,
  exchangeRate
}: { 
  product: ProductType; 
  priority?: boolean; 
  country?: string; 
  currency?: string; 
  cardStyle?: string;
  onClick?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  exchangeRate?: number | null;
}) {
  const logic = useProductCardLogic(product, country);
  const resolvedStyle = normalizeProductCardStyle(cardStyle);

  const layoutProps = { product, logic, currency, priority, onClick, exchangeRate };

  switch (resolvedStyle) {
    case "glass":
      return <GlassCard product={product} currency={currency} priority={priority} country={country} onClick={onClick} exchangeRate={exchangeRate} />;
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
      return <FoodCard {...layoutProps} isFavorite={isFavorite} onToggleFavorite={onToggleFavorite} />;
    case "layout-clean":
    default:
      return <CleanCard {...layoutProps} />;
  }
});
