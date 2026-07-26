"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Image as ImageIcon, Plus, Minus, ChevronRight } from "lucide-react";
import Image from "next/image";
import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import type { ProductCardProduct } from "./product-card-shared";
import { PRODUCT_CARD_FALLBACK_IMAGE, useProductCardLogic } from "./product-card-shared";
import { formatCartMoney } from "../cart/utils/format-cart-money";
import "../../../app/[subdomain]/styles/ProductDetailsModal.css";

interface ProductDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: ProductCardProduct | null;
  country?: string;
  currency?: string;
  showUSD?: boolean;
  onlineOrderingEnabled?: boolean;
  exchangeRate?: number | null;
}

export function ProductDetailsModal({
  isOpen,
  onClose,
  product,
  country = "CL",
  currency = "CLP",
  showUSD = false,
  onlineOrderingEnabled,
  exchangeRate,
}: ProductDetailsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isHudHidden, setIsHudHidden] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const ctaContainerRef = useRef<HTMLDivElement>(null);
  const dragControls = useAnimation();
  const x = useMotionValue(0);
  const fillWidth = useTransform(x, (val) => `calc(130px + ${val}px)`);

  const logic = useProductCardLogic(product || ({} as ProductCardProduct), country);
  // Misma regla que las cards: VE muestra precios en USD.
  const effectiveShowUSD = showUSD || logic.showUSD;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "unset";
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isOpen]);

  const handleHideHud = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsHudHidden(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setIsHudHidden(false);
    }, 4000); // 4 seconds
  };

  const restoreHud = () => {
    if (isHudHidden) {
      setIsHudHidden(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  };

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    if (info.offset.x > 80) {
      handleAdd({ stopPropagation: () => {}, preventDefault: () => {} } as unknown as React.MouseEvent<HTMLButtonElement>);
      dragControls.start({ x: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
      if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
      setTimeout(() => onClose(), 150); // Close the popup shortly after sliding
    } else {
      dragControls.start({ x: 0, transition: { type: "spring", stiffness: 400, damping: 25 } });
    }
  };
  if (!isOpen || !mounted || !product) return null;

  const { quantity, hydrated, handleAdd, handleDecrease, imageSrc } = logic;
  const showStepper = hydrated && quantity > 0;

  // Framer-motion MotionValues must be passed via style — cannot be CSS class
  const trackFillStyle = { width: fillWidth };
  const pillDragStyle = { x };

  return createPortal(
    <motion.div 
      className="pdm-overlay tenant-theme-vars" 
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="pdm-container" 
        onClick={(e) => {
          e.stopPropagation();
          restoreHud();
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 26, stiffness: 220 }}
      >
        
        {/* Blurred Background Removed */}
        
        {/* Top Bar */}
        <div className={`pdm-top-bar pdm-hud-transition ${isHudHidden ? "pdm-hud-hidden" : ""}`}>
          <button className="pdm-back-btn" onClick={onClose} aria-label="Volver">
            <ChevronLeft size={20} strokeWidth={2.5} />
            Volver
          </button>
        </div>

        {/* Main Hero Image — calidad completa solo aquí (cards del menú siguen optimizadas). */}
        <div className="pdm-hero">
          <Image
            src={imageSrc || PRODUCT_CARD_FALLBACK_IMAGE}
            alt={product.name || "Producto"}
            fill
            className="pdm-hero-img"
            sizes="100vw"
            priority
            unoptimized
          />
        </div>

        {/* Floating Actions Sidebar */}
        <div className={`pdm-right-actions pdm-hud-transition ${isHudHidden ? "pdm-hud-hidden" : ""}`}>
          <button className="pdm-icon-btn" aria-label="Ver galería" onClick={handleHideHud}>
            <ImageIcon size={20} strokeWidth={2} />
          </button>
          
          {/* Vertical Stepper */}
          {onlineOrderingEnabled !== false && (
            showStepper ? (
              <div className="pdm-vertical-stepper animate-fade-in" role="group" aria-label="Cantidad">
                <button className="pdm-vstep-btn plus" onClick={handleAdd} aria-label="Aumentar">
                  <Plus size={18} strokeWidth={3} />
                </button>
                <span className="pdm-vstep-count">{quantity}</span>
                <button className="pdm-vstep-btn minus" onClick={handleDecrease} aria-label="Disminuir">
                  <Minus size={18} strokeWidth={3} />
                </button>
              </div>
            ) : (
              <button className="pdm-icon-btn" onClick={handleAdd} aria-label="Agregar">
                <Plus size={20} strokeWidth={2.5} />
              </button>
            )
          )}
        </div>

        {/* Bottom Glass Panel */}
        <div className={`pdm-bottom-section pdm-hud-transition ${isHudHidden ? "pdm-hud-hidden" : ""}`}>
          <div className="pdm-glass-card">
            <h2 className="pdm-title">{product.name}</h2>
            <div className="pdm-info-row">
              <span className="pdm-price">
                {(() => {
                  const priceVal = product.discount_price || product.price;
                  const primaryPriceStr = effectiveShowUSD
                    ? formatCartMoney(priceVal, "USD")
                    : formatCartMoney(priceVal, currency);
                  if (exchangeRate && exchangeRate > 0 && !effectiveShowUSD) {
                    const localCode = currency === "USD" ? "VES" : "USD";
                    const convertedVal = priceVal * exchangeRate;
                    return `${primaryPriceStr} / ${formatCartMoney(convertedVal, localCode)}`;
                  }
                  return primaryPriceStr;
                })()}
              </span>
              <span className="pdm-separator">|</span>
              <p className="pdm-desc">{product.description}</p>
            </div>
          </div>

          {onlineOrderingEnabled !== false && (
            <div className="pdm-cta-container">
              <div className="pdm-track" ref={ctaContainerRef}>
                <motion.div className="pdm-track-fill" style={trackFillStyle} />
                <motion.button 
                  className="pdm-add-pill" 
                  drag="x"
                  style={pillDragStyle}
                  dragConstraints={ctaContainerRef}
                  dragElastic={0.1}
                  dragMomentum={false}
                  onDragEnd={handleDragEnd}
                  animate={dragControls}
                  whileTap={{ scale: 0.95 }}
                >
                  Desliza
                  <ChevronRight size={18} strokeWidth={2.5} />
                </motion.button>
                <div className="pdm-arrows">
                  <ChevronRight size={24} />
                  <ChevronRight size={24} />
                  <ChevronRight size={24} />
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}
