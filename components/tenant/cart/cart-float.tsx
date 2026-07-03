"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "./use-cart";
import { formatCartMoney } from "./utils/format-cart-money";
import "../../../app/[subdomain]/styles/CartFloat.css";

export function CartFloat({ currency = "CLP" }: { currency?: string }) {
  const t = useTranslations("tenant.cart.float");
  const { totalItems, grandTotal, isCartOpen, openCart, closeCart } = useCart();
  const hasItems = totalItems > 0;
  const [isIdle, setIsIdle] = useState(false);
  const [mounted, setMounted] = useState(false);
  const userInteractedRef = useRef(false);
  const prevCountRef = useRef(totalItems);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Evita warnings/bloqueos de Chrome: vibrate solo está permitido luego
    // de una interacción del usuario.
    const markInteracted = () => {
      userInteractedRef.current = true;
    };
    window.addEventListener("touchstart", markInteracted, { once: true });
    window.addEventListener("click", markInteracted, { once: true });
    return () => {
      window.removeEventListener("touchstart", markInteracted);
      window.removeEventListener("click", markInteracted);
    };
  }, []);

  useEffect(() => {
    if (totalItems > prevCountRef.current) {
      if (
        userInteractedRef.current &&
        typeof navigator !== "undefined" &&
        navigator.vibrate
      ) {
        try {
          navigator.vibrate(50);
        } catch {
          // Ignorar: vibrate puede estar bloqueado por el navegador.
        }
      }
    }
    prevCountRef.current = totalItems;
  }, [totalItems]);

  useEffect(() => {
    const resetTimer = () => {
      setIsIdle(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (totalItems > 0) {
        timerRef.current = setTimeout(() => setIsIdle(true), 10000);
      }
    };
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("click", resetTimer);
    window.addEventListener("scroll", resetTimer);
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("click", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [totalItems]);

  return (
    <button
      suppressHydrationWarning
      onClick={() => {
        if (isCartOpen) closeCart();
        else openCart();
      }}
      className={["cart-float", mounted && hasItems ? "has-items" : "", mounted && isIdle && hasItems ? "pulse-urgent" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="cart-icon-wrapper">
        <ShoppingBag size={24} strokeWidth={2.5} />
        {mounted && hasItems ? <span className="cart-float-badge">{totalItems}</span> : null}
      </div>
      <div className="cart-label-container">
        <span className="cart-label-text">
          {mounted && hasItems ? (
            <>
              <span className="cart-total-prefix">{t("totalPrefix")}</span> {formatCartMoney(grandTotal, currency)}
            </>
          ) : (
            t("emptyLabel")
          )}
        </span>
        <ArrowRight size={16} className="cart-arrow" />
      </div>
    </button>
  );
}
