import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
// Define ProductType interface based on usage
interface ProductType {
  id: string;
  name: string | null;
  description?: string | null;
  image_url?: string | null;
  is_special?: boolean;
  has_discount?: boolean;
  discount_price?: number | null;
  price: number;
}
import Image from "next/image";
import { Plus, Minus, ChevronDown, X } from "lucide-react";
import { useCart } from "../cart";
import { getCloudinaryOptimizedUrl } from "../utils/cloudinary";

import { formatCartMoney } from "../cart/utils/format-cart-money";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";

export const ProductCard = React.memo(function ProductCard({ product, priority = false, country = "CL", currency = "CLP" }: { product: ProductType; priority?: boolean; country?: string; currency?: string }) {
  const { cart, addToCart, decreaseQuantity } = useCart();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isBumping, setIsBumping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
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
  const isCloudinary = (product.image_url || "").includes("res.cloudinary.com");
  const fallbackUrl = product.image_url || FALLBACK_IMAGE;

  // Loader personalizado para que Next.js genere múltiples resoluciones (srcset) apuntando a Cloudinary
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
  }, [closeDetails, isExpanded, isLongDesc]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpand();
    }
  };

  const showUSD = country === 'VE' || country === 'Venezuela';

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
                  {showUSD
                    ? formatCartMoney(product.discount_price, 'USD')
                    : formatCartMoney(product.discount_price, currency)}
                </span>
                <span className="product-price original">
                  {showUSD
                    ? formatCartMoney(product.price, 'USD')
                    : formatCartMoney(product.price, currency)}
                </span>
              </>
            ) : (
              <span className="product-price">
                {showUSD
                  ? formatCartMoney(product.price, 'USD')
                  : formatCartMoney(product.price, currency)}
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
