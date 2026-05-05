"use client";

import { createContext } from "react";
import type { BranchProductPriceRow } from "./utils/cart-pricing";

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

export interface CartExtraSelection {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface CartUpsellBeverageSelection {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface CartGlobalExtraSelection {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface CartItem extends CartProduct {
  lineId: string;
  quantity: number;
  selected_extras?: CartExtraSelection[];
  selected_beverages?: CartUpsellBeverageSelection[];
  line_summary?: string | null;
}

/** Línea que es solo una bebida del upsell (no un plato con bebida añadida). */
export function isUpsellBeverageLineId(id: string | null | undefined): boolean {
  return String(id ?? "").startsWith("upsell_beverage_");
}

export type CartFulfillment = "pickup" | "delivery";

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  toggleCart: () => void;
  addToCart: (
    product: CartProduct,
    options?: {
      selectedExtras?: CartExtraSelection[];
      selectedBeverages?: CartUpsellBeverageSelection[];
      forceNewLine?: boolean;
    },
  ) => void;
  decreaseQuantity: (productId: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartTotal: number;
  /** Productos solamente (sin envío). */
  cartSubtotal: number;
  /** Subtotal + envío si aplica delivery activo. */
  grandTotal: number;
  deliveryFee: number;
  totalItems: number;
  getPrice: (product: CartProduct) => number;
  orderNote: string;
  setOrderNote: (note: string) => void;
  generateWhatsAppMessage: () => string;
  fulfillment: CartFulfillment;
  setFulfillment: (value: CartFulfillment) => void;
  deliveryLine1: string;
  setDeliveryLine1: (value: string) => void;
  deliveryCommune: string;
  setDeliveryCommune: (value: string) => void;
  /** Región de Chile para sesgar búsqueda de dirección (modo distancia). Vacío = todas. */
  deliveryRegion: string;
  setDeliveryRegion: (value: string) => void;
  deliveryReference: string;
  setDeliveryReference: (value: string) => void;
  deliveryLat: number | null;
  deliveryLng: number | null;
  setDeliveryCoords: (lat: number | null, lng: number | null) => void;
  /** Zona por nombre (modo manual). */
  deliveryNamedAreaId: string | null;
  setDeliveryNamedAreaId: (id: string | null) => void;
  /** Km manual si no hay GPS (modo distancia). */
  deliveryKmManual: string;
  setDeliveryKmManual: (value: string) => void;
  showDeliveryReference: boolean;
  setShowDeliveryReference: (value: boolean) => void;
  /** Envío gratis por subtotal (reglas del local). */
  deliveryWaivedFree: boolean;
  /** Etiqueta de zona resuelta (dirección automática). */
  deliveryNamedAreaLabel: string | null;
  /** Cotización en curso o error de API. */
  deliveryQuoteLoading: boolean;
  deliveryQuoteError: string | null;
  /** Delivery activo y km excede máximo o fuera de zona. */
  isDeliveryOutOfZone: boolean;
  /** Km en línea recta cliente–local o último km cotizado en servidor. */
  quotedRouteKm: number | null;
  globalExtras: CartGlobalExtraSelection[];
  setGlobalExtras: (extras: CartGlobalExtraSelection[]) => void;
  extrasEnabledByBranch: boolean;
  beveragesUpsellEnabledByBranch: boolean;
  /**
   * Si es false, el envío no muestra monto fijo (p. ej. Uber con copy de tienda);
   * `grandTotal` sigue siendo subtotal + deliveryFee (fee 0 en ese modo).
   */
  deliveryShowNumericFee: boolean;
  /** Texto a mostrar cuando `deliveryShowNumericFee` es false. */
  deliveryExternalHintText: string | null;
  /** Cotización Uber Direct (`estimate_id`) para validar al confirmar pedido. */
  uberQuoteId: string | null;
  /** Cached price rows from the current branch — avoids re-fetching in the modal. */
  branchPriceRows: BranchProductPriceRow[];
  /** Cupón aplicado (código tal como lo guarda el servidor al validar). */
  appliedCouponCode: string | null;
  /** Descuento en moneda del local (entero); solo sobre subtotal de productos/extras, no envío. */
  appliedCouponDiscount: number;
  setAppliedCoupon: (code: string, discountAmount: number) => void;
  clearAppliedCoupon: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export default CartContext;
