"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCart } from "./use-cart";
import { formatCartMoney } from "./utils/format-cart-money";
import { MotionCount } from "../menu/ui/tenant-ui";
import "../../../app/[subdomain]/styles/CartFloat.css";

/**
 * `currency` queda solo como respaldo para cuando el botón se monta fuera del
 * proveedor. La moneda buena es `cartCurrency` del contexto: quien llama pasa
 * `selectedBranch.currency`, que en Venezuela vale "VES" aunque los precios
 * estén en dólares, y el proveedor ya aplica esa excepción.
 */
export function CartFloat({ currency = "CLP", variant = "float" }: { currency?: string; variant?: "float" | "bar" }) {
  const t = useTranslations("tenant.cart.float");
  const { totalItems, grandTotal, isCartOpen, openCart, closeCart, currency: cartCurrency } = useCart();
  const displayCurrency = cartCurrency || currency;
  const hasItems = totalItems > 0;
  const [mounted, setMounted] = useState(false);
  const userInteractedRef = useRef(false);
  const prevCountRef = useRef(totalItems);

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

  /* Barra: ancho completo abajo, solo con algo en el pedido. Cuenta, "Ver
     pedido" y el total a la vista sin hover: en el teléfono no lo hay. */
  if (variant === "bar") {
    const visible = mounted && hasItems;
    return (
      <button
        type="button"
        suppressHydrationWarning
        onClick={() => {
          if (isCartOpen) closeCart();
          else openCart();
        }}
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className={["cart-bar", visible ? "is-visible" : ""].filter(Boolean).join(" ")}
      >
        <span className="cart-bar__count" aria-hidden>
          <ShoppingBag size={18} strokeWidth={2.4} />
          <MotionCount value={visible ? totalItems : 0} />
        </span>
        <span className="cart-bar__label">{t("viewOrder")}</span>
        <span className="cart-bar__total">{visible ? formatCartMoney(grandTotal, displayCurrency) : ""}</span>
        <ArrowRight size={18} className="cart-bar__arrow" aria-hidden />
      </button>
    );
  }

  return (
    <button
      suppressHydrationWarning
      onClick={() => {
        if (isCartOpen) closeCart();
        else openCart();
      }}
      className={["cart-float", mounted && hasItems ? "has-items" : ""].filter(Boolean).join(" ")}
    >
      <div className="cart-icon-wrapper">
        <ShoppingBag size={24} strokeWidth={2.5} />
        {mounted && hasItems ? <span key={totalItems} className="cart-float-badge">{totalItems}</span> : null}
      </div>
      <div className="cart-label-container">
        <span className="cart-label-text">
          {mounted && hasItems ? (
            <>
              <span className="cart-total-prefix">{t("totalPrefix")}</span> {formatCartMoney(grandTotal, displayCurrency)}
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
