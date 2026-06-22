"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import CartContext from "../cart-context";
import type { CartItem } from "../cart-context";
import { isUpsellBeverageLineId } from "../cart-context";
import { createSupabaseBrowserClient } from "../../../../utils/supabase/client";
import { useCartStore, sanitizeQty, sanitizePrice } from "../cart-store";
import {
  computeDeliveryFee,
  effectiveDeliveryPricingMode,
  normalizeDeliverySettings,
  stripStaffOnlyDeliverySettings,
  type DeliveryNamedArea,
} from "@/lib/delivery/delivery-settings";
import { haversineKm, isValidLatLng } from "@/lib/geo/geo";
import { formatCartMoney } from "../utils/format-cart-money";
import { useBranchPrices } from "../hooks/use-branch-prices";
import { useCartBranchFeatureFlags } from "../hooks/use-cart-branch-feature-flags";
import { useDeliveryQuote } from "../hooks/use-delivery-quote";
import { calculateCartTotals } from "../utils/cart-pricing";

export { useTenantCartStore } from "../cart-store";

interface CartProduct {
  id: string;
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  price?: number | null;
  has_discount?: boolean | null;
  discount_price?: number | null;
  is_active?: boolean | null;
}

export function CartProvider({
  children,
  selectedBranchId,
  branchDeliverySettings,
  branchOriginLat,
  branchOriginLng,
  currency = "CLP",
  country = "CL",
}: {
  children: React.ReactNode;
  selectedBranchId?: string | null;
  branchDeliverySettings?: unknown;
  branchOriginLat?: number | null;
  branchOriginLng?: number | null;
  currency?: string;
  country?: string;
}) {
  const store = useCartStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient("tenant"), []);

  const isVenezuela = country === "VE" || country === "Venezuela";
  const cartCurrency = isVenezuela ? "USD" : currency;

  const parsedDelivery = useMemo(
    () => normalizeDeliverySettings(stripStaffOnlyDeliverySettings(branchDeliverySettings)),
    [branchDeliverySettings],
  );

  const [bcvRate, setBcvRate] = useState<number | null>(null);

  useEffect(() => {
    if (isVenezuela) {
      let active = true;
      fetch("https://ve.dolarapi.com/v1/dolares/oficial")
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch BCV rate");
          return res.json();
        })
        .then((data) => {
          if (active && data && typeof data.promedio === "number") {
            setBcvRate(data.promedio);
          }
        })
        .catch((err) => {
          console.error("Error fetching BCV rate from DolarApi:", err);
        });
      return () => {
        active = false;
      };
    }
  }, [isVenezuela]);

  const effectiveExchangeRate = useMemo(() => {
    if (isVenezuela) {
      return bcvRate ?? parsedDelivery.exchangeRate ?? null;
    }
    return parsedDelivery.exchangeRate ?? null;
  }, [isVenezuela, bcvRate, parsedDelivery.exchangeRate]);

  const pricingMode = useMemo(() => effectiveDeliveryPricingMode(parsedDelivery), [parsedDelivery]);

  const branchFeatureFlags = useCartBranchFeatureFlags(branchDeliverySettings, selectedBranchId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const setHydrated = () => setIsHydrated(true);
    try {
      const persistApi = (
        useCartStore as {
          persist?: { hasHydrated?: () => boolean; onFinishHydration?: (cb: () => void) => () => void };
        }
      ).persist;
      if (persistApi?.hasHydrated?.()) {
        setHydrated();
        return;
      }
      const unsub = persistApi?.onFinishHydration?.(setHydrated);
      if (typeof unsub === "function") {
        const t = window.setTimeout(setHydrated, 200);
        return () => {
          unsub();
          window.clearTimeout(t);
        };
      }
    } catch {
      /* empty */
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(setHydrated));
    const fallback = window.setTimeout(setHydrated, 250);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const { setStoredBranchId, storedBranchId, clearCart } = useCartStore.getState();
    if (!selectedBranchId) {
      if (storedBranchId !== null) {
        if (typeof setStoredBranchId === "function") setStoredBranchId(null);
        if (typeof clearCart === "function") clearCart();
      }
      return;
    }
    if (storedBranchId !== selectedBranchId) {
      if (typeof clearCart === "function") clearCart();
      if (typeof setStoredBranchId === "function") setStoredBranchId(selectedBranchId);
    }
  }, [isHydrated, selectedBranchId]);

  useEffect(() => {
    if (!isHydrated) return;
    const { cart, orderNote, setLineNote, setOrderNote } = useCartStore.getState();
    const legacy = typeof orderNote === "string" ? orderNote.trim() : "";
    if (!legacy || !Array.isArray(cart) || cart.length === 0) return;
    if (cart.some((item) => typeof item.line_note === "string" && item.line_note.trim())) {
      return;
    }
    const first = cart[0];
    if (!first?.lineId || typeof setLineNote !== "function") return;
    setLineNote(first.lineId, legacy);
    if (typeof setOrderNote === "function") setOrderNote("");
  }, [isHydrated]);

  useEffect(() => {
    if (!isHydrated || !selectedBranchId) return;
    const st = useCartStore.getState();
    const setF = st.setFulfillment;
    if (typeof setF !== "function") return;
    if (!parsedDelivery.enabled && st.fulfillment === "delivery") {
      setF("pickup");
    }
  }, [isHydrated, selectedBranchId, parsedDelivery.enabled]);

  const branchPriceRows = useBranchPrices(isHydrated, selectedBranchId, supabase);

  const getPrice = useCallback((product: CartProduct | CartItem) => {
    if (typeof product !== "object" || product == null) return 0;
    if (product.has_discount && typeof product.discount_price === "number" && product.discount_price > 0) {
      return product.discount_price;
    }
    if (typeof product.price === "number") return product.price;
    return 0;
  }, []);

  const cartTotal = useMemo(() => {
    if (!Array.isArray(store.cart)) return 0;
    const raw = store.cart.reduce((acc, item) => {
      const price = getPrice(item);
      if (typeof item.quantity !== "number" || item.quantity < 1) return acc;
      const extrasTotal = (item.selected_extras ?? []).reduce(
        (sum, ex) => sum + sanitizePrice(ex.price) * sanitizeQty(ex.qty),
        0,
      );
      const beveragesTotal = isUpsellBeverageLineId(item.id)
        ? 0
        : (item.selected_beverages ?? []).reduce(
            (sum, bev) => sum + sanitizePrice(bev.price) * sanitizeQty(bev.qty),
            0,
          );
      return acc + (price + extrasTotal + beveragesTotal) * item.quantity;
    }, 0);
    return Math.round(raw);
  }, [store.cart, getPrice]);

  const globalExtrasTotal = useMemo(
    () =>
      (store.globalExtras ?? []).reduce((sum, ex) => sum + sanitizePrice(ex.price) * sanitizeQty(ex.qty), 0),
    [store.globalExtras],
  );

  const cartSubtotal = Math.round(cartTotal + globalExtrasTotal);

  const haversineKmVal = useMemo(() => {
    if (pricingMode !== "distance" || store.fulfillment !== "delivery" || !parsedDelivery.enabled) {
      return null;
    }
    if (!isValidLatLng(branchOriginLat, branchOriginLng) || !isValidLatLng(store.deliveryLat, store.deliveryLng)) {
      return null;
    }
    return haversineKm(
      { lat: branchOriginLat as number, lng: branchOriginLng as number },
      { lat: store.deliveryLat as number, lng: store.deliveryLng as number },
    );
  }, [
    pricingMode,
    store.fulfillment,
    store.deliveryLat,
    store.deliveryLng,
    branchOriginLat,
    branchOriginLng,
    parsedDelivery.enabled,
  ]);

  const manualKmParsed = useMemo(() => {
    const n = Number(String(store.deliveryKmManual).replace(",", "."));
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  }, [store.deliveryKmManual]);

  const addressLine = `${store.deliveryLine1}, ${store.deliveryCommune}`.trim();

  const deliveryQuoteQuery = useDeliveryQuote({
    branchId: selectedBranchId,
    fulfillment: store.fulfillment,
    pricingMode: pricingMode,
    addressLine,
    lat: store.deliveryLat,
    lng: store.deliveryLng,
    namedAreaId: store.deliveryNamedAreaId,
    subtotal: cartSubtotal,
    minOrderSubtotal: parsedDelivery.minOrderSubtotal,
    maxDeliveryKm: parsedDelivery.maxDeliveryKm,
    namedAreaResolution: parsedDelivery.namedAreaResolution,
    enabledSettings: parsedDelivery.enabled,
  });

  const quoteData = deliveryQuoteQuery.data;

  const quoteResolved = useMemo(() => {
    if (store.fulfillment !== "delivery" || !parsedDelivery.enabled) {
      return {
        deliveryFee: 0,
        waivedFree: false,
        namedLabel: null as string | null,
        quotedRouteKm: null as number | null,
        outOfZone: false,
        quoteLoading: false,
        quoteError: null as string | null,
        uberQuoteId: null as string | null,
      };
    }

    const minOk =
      parsedDelivery.minOrderSubtotal == null || cartSubtotal + 1e-9 >= parsedDelivery.minOrderSubtotal;
    if (!minOk) {
      return {
        deliveryFee: 0,
        waivedFree: false,
        namedLabel: null,
        quotedRouteKm: null,
        outOfZone: false,
        quoteLoading: false,
        quoteError: null,
        uberQuoteId: null,
      };
    }

    if (quoteData) {
      return {
        deliveryFee: quoteData.fee,
        waivedFree: quoteData.waivedFree,
        namedLabel: quoteData.namedLabel ?? null,
        quotedRouteKm: quoteData.quotedRouteKm ?? null,
        outOfZone: quoteData.outOfZone,
        quoteLoading: deliveryQuoteQuery.isFetching,
        quoteError: quoteData.error ?? null,
        uberQuoteId: quoteData.uberQuoteId ?? null,
      };
    }

    if (deliveryQuoteQuery.isFetching) {
      return {
        deliveryFee: 0,
        waivedFree: false,
        namedLabel:
          pricingMode === "named"
            ? store.deliveryNamedAreaId
              ? parsedDelivery.namedAreas.find((a: DeliveryNamedArea) => a.id === store.deliveryNamedAreaId)?.name ?? null
              : null
            : null,
        quotedRouteKm: null,
        outOfZone: false,
        quoteLoading: true,
        quoteError: null,
        uberQuoteId: null,
      };
    }

    // Fallbacks
    if (pricingMode === "distance") {
      const kmRaw = haversineKmVal ?? (Number.isFinite(manualKmParsed) ? manualKmParsed : 0);
      if (parsedDelivery.maxDeliveryKm != null && kmRaw > parsedDelivery.maxDeliveryKm + 1e-9) {
        return {
          deliveryFee: 0,
          waivedFree: false,
          namedLabel: null,
          quotedRouteKm: Math.max(0, Math.round(kmRaw)),
          outOfZone: true,
          quoteLoading: false,
          quoteError: null,
          uberQuoteId: null,
        };
      }
      const kmBilled = Math.max(0, Math.round(kmRaw));
      const r = computeDeliveryFee(parsedDelivery, kmBilled, cartSubtotal);
      return {
        deliveryFee: Math.round(r.fee < 0 ? 0 : r.fee),
        waivedFree: r.waivedFreeShipping,
        namedLabel: null,
        quotedRouteKm: kmBilled,
        outOfZone: r.fee === -1,
        quoteLoading: false,
        quoteError: null,
        uberQuoteId: null,
      };
    }

    if (pricingMode === "named" && parsedDelivery.namedAreaResolution === "manual_select") {
      const id = store.deliveryNamedAreaId?.trim() || null;
      const areaName =
        id != null ? (parsedDelivery.namedAreas.find((a: DeliveryNamedArea) => a.id === id)?.name ?? null) : null;
      const r = computeDeliveryFee(parsedDelivery, 0, cartSubtotal, {
        namedAreaId: id,
      });
      return {
        deliveryFee: Math.round(r.fee < 0 ? 0 : r.fee),
        waivedFree: r.waivedFreeShipping,
        namedLabel: areaName,
        quotedRouteKm: null,
        outOfZone: false,
        quoteLoading: false,
        quoteError: r.fee === -4 ? "Zona no valida." : null,
        uberQuoteId: null,
      };
    }

    return {
      deliveryFee: 0,
      waivedFree: false,
      namedLabel: null,
      quotedRouteKm: null,
      outOfZone: false,
      quoteLoading: false,
      quoteError: deliveryQuoteQuery.error instanceof Error ? deliveryQuoteQuery.error.message : null,
      uberQuoteId: null,
    };
  }, [
    store.fulfillment,
    store.deliveryNamedAreaId,
    parsedDelivery,
    pricingMode,
    cartSubtotal,
    quoteData,
    deliveryQuoteQuery.isFetching,
    deliveryQuoteQuery.error,
    haversineKmVal,
    manualKmParsed,
  ]);

  const deliveryShowNumericFee = useMemo(() => {
    if (store.fulfillment !== "delivery" || !parsedDelivery.enabled || pricingMode !== "external") {
      return true;
    }
    if (quoteData) return quoteData.fee !== 0 || quoteData.error == null;
    return parsedDelivery.showExternalDeliveryFeeAmount;
  }, [store.fulfillment, parsedDelivery.enabled, parsedDelivery.showExternalDeliveryFeeAmount, pricingMode, quoteData]);

  const deliveryExternalHintText = useMemo(() => {
    if (store.fulfillment !== "delivery" || !parsedDelivery.enabled || pricingMode !== "external") {
      return null;
    }
    if (quoteData && quoteData.fee === 0 && quoteData.error == null) return parsedDelivery.externalDeliveryDisplayText;
    if (!parsedDelivery.showExternalDeliveryFeeAmount && !quoteData) {
      return parsedDelivery.externalDeliveryDisplayText;
    }
    return null;
  }, [
    store.fulfillment,
    parsedDelivery.enabled,
    pricingMode,
    quoteData,
    parsedDelivery.externalDeliveryDisplayText,
    parsedDelivery.showExternalDeliveryFeeAmount,
  ]);

  const uberQuoteId = useMemo(() => {
    if (pricingMode !== "external") return null;
    return quoteResolved.uberQuoteId;
  }, [pricingMode, quoteResolved.uberQuoteId]);

  const appliedCouponDiscount = Math.min(
    Math.round(cartSubtotal),
    Math.max(0, Math.round(Number(store.appliedCouponDiscount) || 0)),
  );

  const totals = useMemo(() => {
    return calculateCartTotals({
      subtotal: cartSubtotal,
      discountAmount: appliedCouponDiscount,
      deliveryFee: quoteResolved.deliveryFee,
      taxRate: parsedDelivery.taxRate,
      taxIncluded: parsedDelivery.taxIncluded,
      exchangeRate: effectiveExchangeRate,
    });
  }, [cartSubtotal, appliedCouponDiscount, quoteResolved.deliveryFee, parsedDelivery.taxRate, parsedDelivery.taxIncluded, effectiveExchangeRate]);

  const grandTotal = totals.total;
  const taxTotal = totals.taxTotal;
  const localTotal = totals.localTotal;
  const deliveryFee = totals.deliveryFee;

  const totalItems = useMemo(() => {
    if (!Array.isArray(store.cart)) return 0;
    return store.cart.reduce((acc, item) => {
      if (typeof item.quantity !== "number" || item.quantity < 1) return acc;
      return acc + item.quantity;
    }, 0);
  }, [store.cart]);

  const generateWhatsAppMessage = useCallback(() => {
    if (!Array.isArray(store.cart) || store.cart.length === 0) return "";

    const currencyCode = cartCurrency;

    let message = "*NUEVO PEDIDO WEB - CLIENTE*\n";
    message += "================================\n\n";

    store.cart.forEach((item) => {
      const price = getPrice(item);
      const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
      const name = typeof item.name === "string" ? item.name : "Producto";
      const extrasText = (item.selected_extras ?? []).map((ex) => `${ex.qty}x ${ex.name}`).join(", ");
      const beveragesText = isUpsellBeverageLineId(item.id)
        ? ""
        : (item.selected_beverages ?? []).map((bev) => `${bev.qty}x ${bev.name}`).join(", ");
      const extrasTotal = (item.selected_extras ?? []).reduce(
        (sum, ex) => sum + sanitizePrice(ex.price) * sanitizeQty(ex.qty),
        0,
      );
      const beveragesTotal = isUpsellBeverageLineId(item.id)
        ? 0
        : (item.selected_beverages ?? []).reduce(
            (sum, bev) => sum + sanitizePrice(bev.price) * sanitizeQty(bev.qty),
            0,
          );
      const sub = Math.round((price + extrasTotal + beveragesTotal) * qty);
      message += `+ ${qty} x ${name.toUpperCase()}\n`;
      if (typeof item.description === "string" && item.description.trim()) {
        message += `   (Hacer: ${item.description})\n`;
      }
      if (extrasText) message += `   Extras: ${extrasText}\n`;
      if (beveragesText) message += `   Bebidas: ${beveragesText}\n`;
      if (typeof item.line_note === "string" && item.line_note.trim()) {
        message += `   Nota: ${item.line_note.trim()}\n`;
      }
      message += `   Subtotal: ${formatCartMoney(sub, currencyCode)}\n`;
      message += "--------------------------------\n";
    });

    if ((store.globalExtras ?? []).length > 0) {
      const gtxt = store.globalExtras.map((ex) => `${ex.qty}x ${ex.name}`).join(", ");
      message += `\nExtras globales: ${gtxt}\n`;
    }

    if (store.fulfillment === "delivery" && deliveryFee > 0) {
      message += `\nEnvio: ${formatCartMoney(deliveryFee, currencyCode)}\n`;
    }
    const couponDisc = Math.min(
      Math.round(cartSubtotal),
      Math.max(0, Math.round(Number(store.appliedCouponDiscount) || 0)),
    );
    if (couponDisc > 0 && store.appliedCouponCode) {
      message += `\nCupón (${store.appliedCouponCode}): -${formatCartMoney(couponDisc, currencyCode)}\n`;
    }

    if (taxTotal > 0) {
      const isInc = parsedDelivery.taxIncluded ?? false;
      const rateStr = parsedDelivery.taxRate ? ` (${parsedDelivery.taxRate}%)` : "";
      const incStr = isInc ? " (Incluido)" : " (Adicional)";
      message += `\nImpuesto${rateStr}${incStr}: ${formatCartMoney(taxTotal, currencyCode)}\n`;
    }

    if (localTotal != null && localTotal > 0) {
      const localCode = currencyCode === "USD" ? "VES" : "USD";
      message += `\n*TOTAL A PAGAR: ${formatCartMoney(grandTotal, currencyCode)} (${formatCartMoney(localTotal, localCode)})*\n`;
    } else {
      message += `\n*TOTAL A PAGAR: ${formatCartMoney(grandTotal, currencyCode)}*\n`;
    }

    message += "================================\n";

    return encodeURIComponent(message);
  }, [
    store.cart,
    store.globalExtras,
    store.fulfillment,
    store.appliedCouponCode,
    store.appliedCouponDiscount,
    grandTotal,
    deliveryFee,
    cartSubtotal,
    getPrice,
    taxTotal,
    localTotal,
    parsedDelivery,
    cartCurrency,
  ]);

  const contextValue = useMemo(
    () => ({
      cart: isHydrated && Array.isArray(store.cart) ? store.cart : [],
      isCartOpen: !!store.isCartOpen,
      toggleCart: typeof store.toggleCart === "function" ? store.toggleCart : () => {},
      addToCart: typeof store.addToCart === "function" ? store.addToCart : () => {},
      decreaseQuantity: typeof store.decreaseQuantity === "function" ? store.decreaseQuantity : () => {},
      removeFromCart: typeof store.removeFromCart === "function" ? store.removeFromCart : () => {},
      clearCart: typeof store.clearCart === "function" ? store.clearCart : () => {},
      orderNote: typeof store.orderNote === "string" ? store.orderNote : "",
      setOrderNote: typeof store.setOrderNote === "function" ? store.setOrderNote : () => {},
      setLineNote: typeof store.setLineNote === "function" ? store.setLineNote : () => {},
      cartTotal: isHydrated ? cartTotal : 0,
      cartSubtotal: isHydrated ? cartSubtotal : 0,
      grandTotal: isHydrated ? grandTotal : 0,
      deliveryFee: isHydrated ? deliveryFee : 0,
      totalItems: isHydrated ? totalItems : 0,
      taxTotal: isHydrated ? taxTotal : 0,
      localTotal: isHydrated ? localTotal : null,
      getPrice,
      generateWhatsAppMessage,
      fulfillment: store.fulfillment,
      setFulfillment: typeof store.setFulfillment === "function" ? store.setFulfillment : () => {},
      deliveryLine1: store.deliveryLine1,
      setDeliveryLine1: typeof store.setDeliveryLine1 === "function" ? store.setDeliveryLine1 : () => {},
      deliveryCommune: store.deliveryCommune,
      setDeliveryCommune: typeof store.setDeliveryCommune === "function" ? store.setDeliveryCommune : () => {},
      deliveryRegion: store.deliveryRegion,
      setDeliveryRegion: typeof store.setDeliveryRegion === "function" ? store.setDeliveryRegion : () => {},
      deliveryReference: store.deliveryReference,
      setDeliveryReference: typeof store.setDeliveryReference === "function" ? store.setDeliveryReference : () => {},
      deliveryLat: store.deliveryLat,
      deliveryLng: store.deliveryLng,
      setDeliveryCoords: typeof store.setDeliveryCoords === "function" ? store.setDeliveryCoords : () => {},
      deliveryNamedAreaId: store.deliveryNamedAreaId,
      setDeliveryNamedAreaId:
        typeof store.setDeliveryNamedAreaId === "function" ? store.setDeliveryNamedAreaId : () => {},
      deliveryKmManual: store.deliveryKmManual,
      setDeliveryKmManual: typeof store.setDeliveryKmManual === "function" ? store.setDeliveryKmManual : () => {},
      showDeliveryReference: store.showDeliveryReference,
      setShowDeliveryReference:
        typeof store.setShowDeliveryReference === "function" ? store.setShowDeliveryReference : () => {},
      globalExtras: Array.isArray(store.globalExtras) ? store.globalExtras : [],
      setGlobalExtras: typeof store.setGlobalExtras === "function" ? store.setGlobalExtras : () => {},
      deliveryWaivedFree: isHydrated ? quoteResolved.waivedFree : false,
      deliveryNamedAreaLabel: isHydrated ? quoteResolved.namedLabel : null,
      deliveryQuoteLoading: isHydrated ? quoteResolved.quoteLoading : false,
      deliveryQuoteError: isHydrated ? quoteResolved.quoteError : null,
      isDeliveryOutOfZone: isHydrated ? quoteResolved.outOfZone : false,
      quotedRouteKm: isHydrated ? quoteResolved.quotedRouteKm : null,
      extrasEnabledByBranch: branchFeatureFlags.extrasEnabledByBranch,
      beveragesUpsellEnabledByBranch: branchFeatureFlags.beveragesUpsellEnabledByBranch,
      deliveryShowNumericFee: isHydrated ? deliveryShowNumericFee : true,
      deliveryExternalHintText: isHydrated ? deliveryExternalHintText : null,
      uberQuoteId: isHydrated ? uberQuoteId : null,
      branchPriceRows,
      appliedCouponCode: store.appliedCouponCode ?? null,
      appliedCouponDiscount: isHydrated ? appliedCouponDiscount : 0,
      setAppliedCoupon: typeof store.setAppliedCoupon === "function" ? store.setAppliedCoupon : () => {},
      clearAppliedCoupon: typeof store.clearAppliedCoupon === "function" ? store.clearAppliedCoupon : () => {},
      currency: cartCurrency,
      country,
      exchangeRate: isHydrated ? effectiveExchangeRate : null,
    }),
    [
      store,
      isHydrated,
      cartTotal,
      cartSubtotal,
      appliedCouponDiscount,
      grandTotal,
      deliveryFee,
      totalItems,
      taxTotal,
      localTotal,
      getPrice,
      generateWhatsAppMessage,
      quoteResolved,
      branchFeatureFlags,
      deliveryShowNumericFee,
      deliveryExternalHintText,
      uberQuoteId,
      branchPriceRows,
      cartCurrency,
      country,
      effectiveExchangeRate,
    ],
  );

  return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}
