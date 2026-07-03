"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  CartExtraSelection,
  CartFulfillment,
  CartGlobalExtraSelection,
  CartItem,
  CartUpsellBeverageSelection,
} from "./cart-context";
import {
  DEFAULT_CHECKOUT_SESSION,
  resetCheckoutSessionToSummary,
  type CheckoutSessionState,
} from "@/lib/tenant/mobile/checkout-session";

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

interface CartState {
  cart: CartItem[];
  isCartOpen: boolean;
  orderNote: string;
  storedBranchId?: string | null;
  appliedCouponCode: string | null;
  appliedCouponDiscount: number;
  fulfillment: CartFulfillment;
  deliveryLine1: string;
  deliveryCommune: string;
  /** Región (Chile) para geocodificación; vacío = sin filtro. */
  deliveryRegion: string;
  deliveryReference: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryNamedAreaId: string | null;
  deliveryKmManual: string;
  showDeliveryReference: boolean;
  globalExtras: CartGlobalExtraSelection[];
  checkoutSession: CheckoutSessionState;
  setCheckoutSession?: (session: CheckoutSessionState) => void;
  patchCheckoutSession?: (patch: Partial<CheckoutSessionState>) => void;
  resetCheckoutSession?: () => void;
  closeCart?: () => void;
  openCart?: () => void;
  toggleCart?: () => void;
  addToCart?: (
    product: CartProduct,
    options?: {
      selectedExtras?: CartExtraSelection[];
      selectedBeverages?: CartUpsellBeverageSelection[];
      forceNewLine?: boolean;
    },
  ) => void;
  decreaseQuantity?: (lineIdOrProductId: string) => void;
  removeFromCart?: (id: string) => void;
  clearCart?: () => void;
  setOrderNote?: (note: string) => void;
  setLineNote?: (lineId: string, note: string) => void;
  setCart?: (cart: CartItem[]) => void;
  setStoredBranchId?: (id: string | null) => void;
  setFulfillment?: (value: CartFulfillment) => void;
  setDeliveryLine1?: (value: string) => void;
  setDeliveryCommune?: (value: string) => void;
  setDeliveryRegion?: (value: string) => void;
  setDeliveryReference?: (value: string) => void;
  setDeliveryCoords?: (lat: number | null, lng: number | null) => void;
  setDeliveryNamedAreaId?: (id: string | null) => void;
  setDeliveryKmManual?: (value: string) => void;
  setShowDeliveryReference?: (value: boolean) => void;
  setGlobalExtras?: (extras: CartGlobalExtraSelection[]) => void;
  setAppliedCoupon?: (code: string, discountAmount: number) => void;
  clearAppliedCoupon?: () => void;
}

function buildLineId(productId: string): string {
  return `${productId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`;
}

function lineSelectionsKey(
  extras: CartExtraSelection[] | undefined,
  beverages: CartUpsellBeverageSelection[] | undefined,
): string {
  const e = (extras ?? [])
    .map((x) => `${x.id}:${x.qty}`)
    .sort()
    .join("|");
  const b = (beverages ?? [])
    .map((x) => `${x.id}:${x.qty}`)
    .sort()
    .join("|");
  return `e(${e})-b(${b})`;
}

function sanitizeQty(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.max(1, Math.round(v)) : 1;
}

function sanitizePrice(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: [],
      isCartOpen: false,
      orderNote: "",
      storedBranchId: null,
      appliedCouponCode: null,
      appliedCouponDiscount: 0,
      fulfillment: "pickup",
      deliveryLine1: "",
      deliveryCommune: "",
      deliveryRegion: "",
      deliveryReference: "",
      deliveryLat: null,
      deliveryLng: null,
      deliveryNamedAreaId: null,
      deliveryKmManual: "",
      showDeliveryReference: false,
      globalExtras: [],
      checkoutSession: { ...DEFAULT_CHECKOUT_SESSION },

      openCart: () => set({ isCartOpen: true }),
      closeCart: () => set({ isCartOpen: false }),

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      setCheckoutSession: (session) => set({ checkoutSession: session }),

      patchCheckoutSession: (patch) =>
        set((state) => ({
          checkoutSession: { ...state.checkoutSession, ...patch },
        })),

      resetCheckoutSession: () =>
        set({ checkoutSession: { ...DEFAULT_CHECKOUT_SESSION } }),

      addToCart: (product, options) =>
        set((state) => {
          const checkoutSession = resetCheckoutSessionToSummary(state.checkoutSession);
          if (!product?.id) return { checkoutSession };
          const normalizedExtras = (options?.selectedExtras ?? [])
            .filter((x) => x && typeof x.id === "string")
            .map((x) => ({
              id: x.id,
              name: String(x.name ?? "Extra"),
              price: sanitizePrice(x.price),
              qty: sanitizeQty(x.qty),
            }))
            .filter((x) => x.price >= 0);
          const normalizedBeverages = (options?.selectedBeverages ?? [])
            .filter((x) => x && typeof x.id === "string")
            .map((x) => ({
              id: x.id,
              name: String(x.name ?? "Bebida"),
              price: sanitizePrice(x.price),
              qty: sanitizeQty(x.qty),
            }))
            .filter((x) => x.price >= 0);
          const selectionKey = lineSelectionsKey(normalizedExtras, normalizedBeverages);
          const existing = options?.forceNewLine
            ? null
            : state.cart.find(
                (item) =>
                  item.id === product.id &&
                  lineSelectionsKey(item.selected_extras, item.selected_beverages) === selectionKey,
              );
          if (existing) {
            if (existing.quantity >= 20) return { checkoutSession };
            return {
              checkoutSession,
              cart: state.cart.map((item) =>
                item.lineId === existing.lineId ? { ...item, quantity: item.quantity + 1 } : item,
              ),
            };
          }
          const newItem: CartItem = {
            lineId: buildLineId(product.id),
            id: product.id,
            name: product.name ?? null,
            description: product.description ?? null,
            image_url: product.image_url ?? null,
            price: product.price ?? null,
            has_discount: product.has_discount ?? null,
            discount_price: product.discount_price ?? null,
            is_active: product.is_active ?? null,
            quantity: 1,
            selected_extras: normalizedExtras,
            selected_beverages: normalizedBeverages,
            line_summary: null,
            line_note: null,
          };
          return { checkoutSession, cart: [...state.cart, newItem] };
        }),

      decreaseQuantity: (lineIdOrProductId) =>
        set((state) => {
          const checkoutSession = resetCheckoutSessionToSummary(state.checkoutSession);
          let targetIndex = state.cart.findIndex((item) => item.lineId === lineIdOrProductId);
          if (targetIndex < 0) {
            for (let i = state.cart.length - 1; i >= 0; i -= 1) {
              if (state.cart[i].id === lineIdOrProductId) {
                targetIndex = i;
                break;
              }
            }
          }
          if (targetIndex < 0) return {};

          const target = state.cart[targetIndex];

          if (target.quantity <= 1) {
            return {
              checkoutSession,
              cart: state.cart.filter((_, index) => index !== targetIndex),
            };
          }

          return {
            checkoutSession,
            cart: state.cart.map((item, index) =>
              index === targetIndex ? { ...item, quantity: item.quantity - 1 } : item,
            ),
          };
        }),

      removeFromCart: (id) =>
        set((state) => ({
          checkoutSession: resetCheckoutSessionToSummary(state.checkoutSession),
          cart: state.cart.filter((item) => item.lineId !== id && item.id !== id),
        })),

      clearCart: () =>
        set({
          cart: [],
          orderNote: "",
          fulfillment: "pickup",
          deliveryLine1: "",
          deliveryCommune: "",
          deliveryRegion: "",
          deliveryReference: "",
          deliveryLat: null,
          deliveryLng: null,
          deliveryNamedAreaId: null,
          deliveryKmManual: "",
          showDeliveryReference: false,
          globalExtras: [],
          appliedCouponCode: null,
          appliedCouponDiscount: 0,
          checkoutSession: { ...DEFAULT_CHECKOUT_SESSION },
        }),

      setAppliedCoupon: (code, discountAmount) =>
        set({
          appliedCouponCode: String(code ?? "").trim().toUpperCase(),
          appliedCouponDiscount: Math.max(0, Math.round(Number(discountAmount) || 0)),
        }),

      clearAppliedCoupon: () =>
        set({
          appliedCouponCode: null,
          appliedCouponDiscount: 0,
        }),

      setOrderNote: (note) => set({ orderNote: note }),

      setLineNote: (lineId, note) =>
        set((state) => ({
          cart: state.cart.map((item) =>
            item.lineId === lineId ? { ...item, line_note: note } : item,
          ),
        })),

      setCart: (newCart) => set({ cart: newCart }),

      setStoredBranchId: (id) => set({ storedBranchId: id }),

      setFulfillment: (value) => set({ fulfillment: value }),

      setDeliveryLine1: (value) => set({ deliveryLine1: value }),

      setDeliveryCommune: (value) => set({ deliveryCommune: value }),

      setDeliveryRegion: (value) => set({ deliveryRegion: value }),

      setDeliveryReference: (value) => set({ deliveryReference: value }),

      setDeliveryCoords: (lat, lng) => set({ deliveryLat: lat, deliveryLng: lng }),

      setDeliveryNamedAreaId: (id) => set({ deliveryNamedAreaId: id }),

      setDeliveryKmManual: (value) => set({ deliveryKmManual: value }),

      setShowDeliveryReference: (value) => set({ showDeliveryReference: value }),

      setGlobalExtras: (extras) =>
        set({
          globalExtras: Array.isArray(extras)
            ? extras
                .filter((x) => x && typeof x.id === "string")
                .map((x) => ({
                  id: x.id,
                  name: String(x.name ?? "Extra"),
                  price: sanitizePrice(x.price),
                  qty: sanitizeQty(x.qty),
                }))
            : [],
        }),
    }),
    {
      name: "tenant_cart_storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        orderNote: state.orderNote,
        storedBranchId: state.storedBranchId,
        globalExtras: state.globalExtras,
      }),
    },
  ),
);

export { useCartStore as useTenantCartStore };

/** Exportado para totales en el provider (extras/bebidas por línea). */
export { sanitizeQty, sanitizePrice };
