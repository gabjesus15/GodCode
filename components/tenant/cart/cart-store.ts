"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
	AddToCartOptions,
	CartExtraSelection,
	CartFulfillment,
	CartGlobalExtraSelection,
	CartItem,
	CartProduct,
	CartUpsellBeverageSelection,
} from "./cart-context";
import {
	DEFAULT_CHECKOUT_SESSION,
	resetCheckoutSessionToSummary,
	type CheckoutSessionState,
} from "@/lib/tenant/mobile/checkout-session";
import { isCloudinaryImageUrl } from "@/lib/tenant/images/is-cloudinary-image-url";

const MAX_LINE_QUANTITY = 20;

function sanitizeCartImageUrl(value: string | null | undefined): string | null {
	const raw = typeof value === "string" ? value.trim() : "";
	if (!raw || isCloudinaryImageUrl(raw)) return null;
	return raw;
}

export interface CartState {
	cart: CartItem[];
	isCartOpen: boolean;
	/** Nota global heredada: el provider la migra a la primera línea y la vacía. */
	orderNote: string;
	storedBranchId: string | null;
	appliedCouponCode: string | null;
	appliedCouponDiscount: number;
	fulfillment: CartFulfillment;
	deliveryLine1: string;
	deliveryCommune: string;
	deliveryReference: string;
	deliveryLat: number | null;
	deliveryLng: number | null;
	deliveryNamedAreaId: string | null;
	deliveryKmManual: string;
	globalExtras: CartGlobalExtraSelection[];
	checkoutSession: CheckoutSessionState;
	setCheckoutSession: (session: CheckoutSessionState) => void;
	patchCheckoutSession: (patch: Partial<CheckoutSessionState>) => void;
	resetCheckoutSession: () => void;
	openCart: () => void;
	closeCart: () => void;
	addToCart: (product: CartProduct, options?: AddToCartOptions) => void;
	decreaseQuantity: (lineIdOrProductId: string) => void;
	removeFromCart: (id: string) => void;
	clearCart: () => void;
	setOrderNote: (note: string) => void;
	setLineNote: (lineId: string, note: string) => void;
	setCart: (cart: CartItem[]) => void;
	setStoredBranchId: (id: string | null) => void;
	setFulfillment: (value: CartFulfillment) => void;
	setDeliveryLine1: (value: string) => void;
	setDeliveryCommune: (value: string) => void;
	setDeliveryReference: (value: string) => void;
	setDeliveryCoords: (lat: number | null, lng: number | null) => void;
	setDeliveryNamedAreaId: (id: string | null) => void;
	setDeliveryKmManual: (value: string) => void;
	setGlobalExtras: (extras: CartGlobalExtraSelection[]) => void;
	setAppliedCoupon: (code: string, discountAmount: number) => void;
	clearAppliedCoupon: () => void;
}

function buildLineId(productId: string): string {
	return `${productId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 7)}`;
}

function lineSelectionsKey(
	extras: CartExtraSelection[] | undefined,
	beverages: CartUpsellBeverageSelection[] | undefined,
): string {
	const serialize = (list: CartExtraSelection[] | undefined) =>
		(list ?? [])
			.map((x) => `${x.id}:${x.qty}`)
			.sort()
			.join("|");
	return `e(${serialize(extras)})-b(${serialize(beverages)})`;
}

function sanitizeQty(n: unknown): number {
	const v = Number(n);
	return Number.isFinite(v) && v > 0 ? Math.max(1, Math.round(v)) : 1;
}

function sanitizePrice(n: unknown): number {
	const v = Number(n);
	return Number.isFinite(v) && v > 0 ? Math.round(v) : 0;
}

function normalizeSelections(
	list: CartExtraSelection[] | undefined,
	fallbackName: string,
): CartExtraSelection[] {
	return (list ?? [])
		.filter((x) => x && typeof x.id === "string")
		.map((x) => ({
			id: x.id,
			name: String(x.name ?? fallbackName),
			price: sanitizePrice(x.price),
			qty: sanitizeQty(x.qty),
		}));
}

const EMPTY_DELIVERY = {
	fulfillment: "pickup" as CartFulfillment,
	deliveryLine1: "",
	deliveryCommune: "",
	deliveryReference: "",
	deliveryLat: null,
	deliveryLng: null,
	deliveryNamedAreaId: null,
	deliveryKmManual: "",
};

export const useCartStore = create<CartState>()(
	persist(
		(set) => ({
			cart: [],
			isCartOpen: false,
			orderNote: "",
			storedBranchId: null,
			appliedCouponCode: null,
			appliedCouponDiscount: 0,
			...EMPTY_DELIVERY,
			globalExtras: [],
			checkoutSession: { ...DEFAULT_CHECKOUT_SESSION },

			openCart: () => set({ isCartOpen: true }),
			closeCart: () => set({ isCartOpen: false }),

			setCheckoutSession: (session) => set({ checkoutSession: session }),
			patchCheckoutSession: (patch) =>
				set((state) => ({ checkoutSession: { ...state.checkoutSession, ...patch } })),
			resetCheckoutSession: () => set({ checkoutSession: { ...DEFAULT_CHECKOUT_SESSION } }),

			addToCart: (product, options) =>
				set((state) => {
					const checkoutSession = resetCheckoutSessionToSummary(state.checkoutSession);
					if (!product?.id) return { checkoutSession };
					const normalizedExtras = normalizeSelections(options?.selectedExtras, "Extra");
					const normalizedBeverages = normalizeSelections(options?.selectedBeverages, "Bebida");
					const selectionKey = lineSelectionsKey(normalizedExtras, normalizedBeverages);
					const existing = options?.forceNewLine
						? null
						: state.cart.find(
								(item) =>
									item.id === product.id &&
									lineSelectionsKey(item.selected_extras, item.selected_beverages) ===
										selectionKey,
							);
					if (existing) {
						if (existing.quantity >= MAX_LINE_QUANTITY) return { checkoutSession };
						return {
							checkoutSession,
							cart: state.cart.map((item) =>
								item.lineId === existing.lineId
									? { ...item, quantity: item.quantity + 1 }
									: item,
							),
						};
					}
					const newItem: CartItem = {
						lineId: buildLineId(product.id),
						id: product.id,
						name: product.name ?? null,
						description: product.description ?? null,
						image_url: sanitizeCartImageUrl(product.image_url),
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
					...EMPTY_DELIVERY,
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
			clearAppliedCoupon: () => set({ appliedCouponCode: null, appliedCouponDiscount: 0 }),

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
			setDeliveryReference: (value) => set({ deliveryReference: value }),
			setDeliveryCoords: (lat, lng) => set({ deliveryLat: lat, deliveryLng: lng }),
			setDeliveryNamedAreaId: (id) => set({ deliveryNamedAreaId: id }),
			setDeliveryKmManual: (value) => set({ deliveryKmManual: value }),
			setGlobalExtras: (extras) =>
				set({ globalExtras: Array.isArray(extras) ? normalizeSelections(extras, "Extra") : [] }),
		}),
		{
			name: "tenant_cart_storage",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				cart: state.cart.map((item) => ({
					...item,
					image_url: sanitizeCartImageUrl(item.image_url),
				})),
				orderNote: state.orderNote,
				storedBranchId: state.storedBranchId,
				globalExtras: state.globalExtras,
			}),
			merge: (persisted, current) => {
				const p = (persisted ?? {}) as Partial<CartState>;
				return {
					...current,
					...p,
					cart: Array.isArray(p.cart)
						? p.cart.map((item) => ({
								...item,
								image_url: sanitizeCartImageUrl(item.image_url),
							}))
						: current.cart,
				};
			},
		},
	),
);

export { useCartStore as useTenantCartStore };

/** Exportado para totales en el provider (extras/bebidas por línea). */
export { sanitizeQty, sanitizePrice };
