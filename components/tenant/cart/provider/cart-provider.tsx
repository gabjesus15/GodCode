"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import {
	effectiveDeliveryPricingMode,
	normalizeDeliverySettings,
	stripStaffOnlyDeliverySettings,
} from "@/lib/delivery/delivery-settings";
import { haversineKm, isValidLatLng } from "@/lib/geo/geo";
import { createSupabaseBrowserClient } from "../../../../utils/supabase/client";
import CartContext, {
	isUpsellBeverageLineId,
	type CartContextType,
	type CartItem,
	type CartProduct,
} from "../cart-context";
import { sanitizePrice, sanitizeQty, useCartStore } from "../cart-store";
import { useBranchPrices } from "../hooks/use-branch-prices";
import { useCartBranchFeatureFlags } from "../hooks/use-cart-branch-feature-flags";
import { useDeliveryQuote } from "../hooks/use-delivery-quote";
import { calculateCartTotals } from "../utils/cart-pricing";
import { resolveDeliveryQuoteState } from "../utils/delivery-quote-state";
import { parseManualKm } from "../utils/fulfillment-validation";
import { joinAddressLine } from "../utils/street-number";
import { isVenezuelaCountry } from "../utils/venezuela-payment-copy";

export { useTenantCartStore } from "../cart-store";

const BCV_RATE_ENDPOINT = "https://ve.dolarapi.com/v1/dolares/oficial";

type PersistApi = {
	setOptions?: (options: { name: string }) => void;
	rehydrate?: () => Promise<void> | void;
	hasHydrated?: () => boolean;
	onFinishHydration?: (cb: () => void) => () => void;
};

function persistApi(): PersistApi | undefined {
	return (useCartStore as unknown as { persist?: PersistApi }).persist;
}

function lineTotal(item: CartItem, unitPrice: number): number {
	const extrasTotal = (item.selected_extras ?? []).reduce(
		(sum, extra) => sum + sanitizePrice(extra.price) * sanitizeQty(extra.qty),
		0,
	);
	const beveragesTotal = isUpsellBeverageLineId(item.id)
		? 0
		: (item.selected_beverages ?? []).reduce(
				(sum, beverage) => sum + sanitizePrice(beverage.price) * sanitizeQty(beverage.qty),
				0,
			);
	return (unitPrice + extrasTotal + beveragesTotal) * item.quantity;
}

export function CartProvider({
	children,
	tenantSlug,
	selectedBranchId,
	branchDeliverySettings,
	branchOriginLat,
	branchOriginLng,
	currency = "CLP",
	country = "CL",
}: {
	children: React.ReactNode;
	tenantSlug?: string | null;
	selectedBranchId?: string | null;
	branchDeliverySettings?: unknown;
	branchOriginLat?: number | null;
	branchOriginLng?: number | null;
	currency?: string;
	country?: string;
}) {
	const store = useCartStore(
		useShallow((state) => ({
			cart: state.cart,
			isCartOpen: state.isCartOpen,
			openCart: state.openCart,
			closeCart: state.closeCart,
			addToCart: state.addToCart,
			decreaseQuantity: state.decreaseQuantity,
			removeFromCart: state.removeFromCart,
			clearCart: state.clearCart,
			setLineNote: state.setLineNote,
			fulfillment: state.fulfillment,
			setFulfillment: state.setFulfillment,
			deliveryLine1: state.deliveryLine1,
			setDeliveryLine1: state.setDeliveryLine1,
			deliveryCommune: state.deliveryCommune,
			setDeliveryCommune: state.setDeliveryCommune,
			deliveryReference: state.deliveryReference,
			setDeliveryReference: state.setDeliveryReference,
			deliveryLat: state.deliveryLat,
			deliveryLng: state.deliveryLng,
			setDeliveryCoords: state.setDeliveryCoords,
			deliveryNamedAreaId: state.deliveryNamedAreaId,
			setDeliveryNamedAreaId: state.setDeliveryNamedAreaId,
			deliveryKmManual: state.deliveryKmManual,
			setDeliveryKmManual: state.setDeliveryKmManual,
			globalExtras: state.globalExtras,
			setGlobalExtras: state.setGlobalExtras,
			appliedCouponCode: state.appliedCouponCode,
			appliedCouponDiscount: state.appliedCouponDiscount,
			setAppliedCoupon: state.setAppliedCoupon,
			clearAppliedCoupon: state.clearAppliedCoupon,
		})),
	);
	const isCartOpen = store.isCartOpen;
	const [isHydrated, setIsHydrated] = useState(false);
	const supabase = useMemo(() => createSupabaseBrowserClient("tenant"), []);

	// En Venezuela el catálogo está en dólares aunque la sucursal declare VES.
	const isVenezuela = isVenezuelaCountry(country);
	const cartCurrency = isVenezuela ? "USD" : currency;

	const settings = useMemo(
		() => normalizeDeliverySettings(stripStaffOnlyDeliverySettings(branchDeliverySettings)),
		[branchDeliverySettings],
	);
	const pricingMode = useMemo(() => effectiveDeliveryPricingMode(settings), [settings]);
	const branchFeatureFlags = useCartBranchFeatureFlags(branchDeliverySettings, selectedBranchId);

	const [bcvRate, setBcvRate] = useState<number | null>(null);
	useEffect(() => {
		if (!isVenezuela || !isCartOpen) return;
		const controller = new AbortController();
		fetch(BCV_RATE_ENDPOINT, { signal: controller.signal })
			.then((response) => (response.ok ? response.json() : null))
			.then((data: { promedio?: unknown } | null) => {
				if (data && typeof data.promedio === "number") setBcvRate(data.promedio);
			})
			.catch(() => {
				/* sin tasa en vivo: se usa la configurada por el local */
			});
		return () => controller.abort();
	}, [isVenezuela, isCartOpen]);

	const exchangeRate = useMemo(() => {
		if (isVenezuela) return bcvRate ?? settings.exchangeRate ?? null;
		return settings.exchangeRate ?? null;
	}, [isVenezuela, bcvRate, settings.exchangeRate]);

	// Persistencia por tenant: el nombre del storage lleva el slug y se rehidrata al cambiar.
	useEffect(() => {
		if (!tenantSlug) return;
		let cancelled = false;
		const api = persistApi();
		api?.setOptions?.({ name: `tenant_cart_storage_${tenantSlug}` });
		const finish = () => {
			if (!cancelled) setIsHydrated(true);
		};
		const result = api?.rehydrate?.();
		if (result && typeof (result as Promise<void>).then === "function") {
			void (result as Promise<void>).then(finish).catch(finish);
		} else {
			window.setTimeout(finish, 0);
		}
		return () => {
			cancelled = true;
		};
	}, [tenantSlug]);

	// Dominios propios llegan sin slug: hidratación por defecto con respaldo temporal.
	useEffect(() => {
		if (typeof window === "undefined") return;
		const markHydrated = () => setIsHydrated(true);
		const api = persistApi();
		if (api?.hasHydrated?.()) {
			window.setTimeout(markHydrated, 0);
			return;
		}
		const unsubscribe = api?.onFinishHydration?.(markHydrated);
		const fallback = window.setTimeout(markHydrated, 250);
		return () => {
			unsubscribe?.();
			window.clearTimeout(fallback);
		};
	}, []);

	// Cambiar de sucursal vacía el carrito; la primera asignación (null → id) lo conserva.
	useEffect(() => {
		if (!isHydrated) return;
		const { setStoredBranchId, storedBranchId, clearCart } = useCartStore.getState();
		if (!selectedBranchId) {
			if (storedBranchId !== null) {
				setStoredBranchId(null);
				clearCart();
			}
			return;
		}
		if (storedBranchId == null) {
			setStoredBranchId(selectedBranchId);
			return;
		}
		if (storedBranchId !== selectedBranchId) {
			clearCart();
			setStoredBranchId(selectedBranchId);
		}
	}, [isHydrated, selectedBranchId]);

	// Nota global heredada de versiones anteriores → nota de la primera línea.
	useEffect(() => {
		if (!isHydrated) return;
		const { cart, orderNote, setLineNote, setOrderNote } = useCartStore.getState();
		const legacy = typeof orderNote === "string" ? orderNote.trim() : "";
		if (!legacy || cart.length === 0) return;
		if (cart.some((item) => typeof item.line_note === "string" && item.line_note.trim())) return;
		const first = cart[0];
		if (!first?.lineId) return;
		setLineNote(first.lineId, legacy);
		setOrderNote("");
	}, [isHydrated]);

	useEffect(() => {
		if (!isHydrated || !selectedBranchId) return;
		const state = useCartStore.getState();
		if (!settings.enabled && state.fulfillment === "delivery") state.setFulfillment("pickup");
	}, [isHydrated, selectedBranchId, settings.enabled]);

	const branchPriceRows = useBranchPrices(isHydrated, selectedBranchId, supabase);

	const getPrice = useCallback((product: CartProduct | CartItem) => {
		if (typeof product !== "object" || product == null) return 0;
		const coerce = (value: unknown): number => {
			const n = Number(value);
			return Number.isFinite(n) ? n : 0;
		};
		const discount = coerce(product.discount_price);
		if (product.has_discount && discount > 0) return discount;
		return coerce(product.price);
	}, []);

	const productsTotal = useMemo(
		() =>
			Math.round(
				store.cart.reduce((acc, item) => {
					if (typeof item.quantity !== "number" || item.quantity < 1) return acc;
					return acc + lineTotal(item, getPrice(item));
				}, 0),
			),
		[store.cart, getPrice],
	);
	const globalExtrasTotal = useMemo(
		() =>
			store.globalExtras.reduce(
				(sum, extra) => sum + sanitizePrice(extra.price) * sanitizeQty(extra.qty),
				0,
			),
		[store.globalExtras],
	);
	const cartSubtotal = Math.round(productsTotal + globalExtrasTotal);

	const isDelivery = store.fulfillment === "delivery";

	const haversineKmValue = useMemo(() => {
		if (pricingMode !== "distance" || !isDelivery || !settings.enabled) return null;
		if (
			!isValidLatLng(branchOriginLat, branchOriginLng) ||
			!isValidLatLng(store.deliveryLat, store.deliveryLng)
		) {
			return null;
		}
		return haversineKm(
			{ lat: branchOriginLat as number, lng: branchOriginLng as number },
			{ lat: store.deliveryLat as number, lng: store.deliveryLng as number },
		);
	}, [
		pricingMode,
		isDelivery,
		store.deliveryLat,
		store.deliveryLng,
		branchOriginLat,
		branchOriginLng,
		settings.enabled,
	]);

	const addressLine = joinAddressLine(store.deliveryLine1, store.deliveryCommune);

	const quoteQuery = useDeliveryQuote({
		branchId: selectedBranchId,
		fulfillment: store.fulfillment,
		pricingMode,
		addressLine,
		lat: store.deliveryLat,
		lng: store.deliveryLng,
		namedAreaId: store.deliveryNamedAreaId,
		subtotal: cartSubtotal,
		minOrderSubtotal: settings.minOrderSubtotal,
		maxDeliveryKm: settings.maxDeliveryKm,
		namedAreaResolution: settings.namedAreaResolution,
		enabledSettings: settings.enabled,
		checkoutActive: isCartOpen,
	});
	const quoteData = quoteQuery.data;

	const quote = useMemo(
		() =>
			resolveDeliveryQuoteState({
				isDelivery,
				settings,
				pricingMode,
				cartSubtotal,
				namedAreaId: store.deliveryNamedAreaId,
				quote: quoteData,
				quoteFetching: quoteQuery.isFetching,
				quoteFetchError: quoteQuery.error instanceof Error ? quoteQuery.error.message : null,
				haversineKm: haversineKmValue,
				manualKm: parseManualKm(store.deliveryKmManual),
			}),
		[
			isDelivery,
			settings,
			pricingMode,
			cartSubtotal,
			store.deliveryNamedAreaId,
			store.deliveryKmManual,
			quoteData,
			quoteQuery.isFetching,
			quoteQuery.error,
			haversineKmValue,
		],
	);

	const externalDelivery = isDelivery && settings.enabled && pricingMode === "external";
	const deliveryShowNumericFee = !externalDelivery
		? true
		: quoteData
			? quoteData.fee !== 0 || quoteData.error == null
			: settings.showExternalDeliveryFeeAmount;
	const deliveryExternalHintText = !externalDelivery
		? null
		: (quoteData && quoteData.fee === 0 && quoteData.error == null) ||
			  (!quoteData && !settings.showExternalDeliveryFeeAmount)
			? settings.externalDeliveryDisplayText
			: null;

	const appliedCouponDiscount = Math.min(
		Math.round(cartSubtotal),
		Math.max(0, Math.round(Number(store.appliedCouponDiscount) || 0)),
	);

	const totals = useMemo(
		() =>
			calculateCartTotals({
				subtotal: cartSubtotal,
				discountAmount: appliedCouponDiscount,
				deliveryFee: quote.deliveryFee,
				taxRate: settings.taxRate,
				taxIncluded: settings.taxIncluded,
				exchangeRate,
			}),
		[
			cartSubtotal,
			appliedCouponDiscount,
			quote.deliveryFee,
			settings.taxRate,
			settings.taxIncluded,
			exchangeRate,
		],
	);

	const totalItems = useMemo(
		() =>
			store.cart.reduce(
				(acc, item) =>
					typeof item.quantity === "number" && item.quantity >= 1 ? acc + item.quantity : acc,
				0,
			),
		[store.cart],
	);

	const contextValue = useMemo<CartContextType>(
		() => ({
			cart: isHydrated ? store.cart : [],
			isCartOpen: store.isCartOpen,
			openCart: store.openCart,
			closeCart: store.closeCart,
			addToCart: store.addToCart,
			decreaseQuantity: store.decreaseQuantity,
			removeFromCart: store.removeFromCart,
			clearCart: store.clearCart,
			setLineNote: store.setLineNote,
			cartSubtotal: isHydrated ? cartSubtotal : 0,
			grandTotal: isHydrated ? totals.total : 0,
			deliveryFee: isHydrated ? totals.deliveryFee : 0,
			totalItems: isHydrated ? totalItems : 0,
			taxTotal: isHydrated ? totals.taxTotal : 0,
			localTotal: isHydrated ? totals.localTotal : null,
			getPrice,
			fulfillment: store.fulfillment,
			setFulfillment: store.setFulfillment,
			deliveryLine1: store.deliveryLine1,
			setDeliveryLine1: store.setDeliveryLine1,
			deliveryCommune: store.deliveryCommune,
			setDeliveryCommune: store.setDeliveryCommune,
			deliveryReference: store.deliveryReference,
			setDeliveryReference: store.setDeliveryReference,
			deliveryLat: store.deliveryLat,
			deliveryLng: store.deliveryLng,
			setDeliveryCoords: store.setDeliveryCoords,
			deliveryNamedAreaId: store.deliveryNamedAreaId,
			setDeliveryNamedAreaId: store.setDeliveryNamedAreaId,
			deliveryKmManual: store.deliveryKmManual,
			setDeliveryKmManual: store.setDeliveryKmManual,
			globalExtras: store.globalExtras,
			setGlobalExtras: store.setGlobalExtras,
			deliveryWaivedFree: isHydrated ? quote.waivedFree : false,
			deliveryNamedAreaLabel: isHydrated ? quote.namedLabel : null,
			deliveryQuoteLoading: isHydrated ? quote.quoteLoading : false,
			deliveryQuoteError: isHydrated ? quote.quoteError : null,
			isDeliveryOutOfZone: isHydrated ? quote.outOfZone : false,
			quotedRouteKm: isHydrated ? quote.quotedRouteKm : null,
			extrasEnabledByBranch: branchFeatureFlags.extrasEnabledByBranch,
			beveragesUpsellEnabledByBranch: branchFeatureFlags.beveragesUpsellEnabledByBranch,
			deliveryShowNumericFee: isHydrated ? deliveryShowNumericFee : true,
			deliveryExternalHintText: isHydrated ? deliveryExternalHintText : null,
			uberQuoteId: isHydrated && pricingMode === "external" ? quote.uberQuoteId : null,
			branchPriceRows,
			appliedCouponCode: store.appliedCouponCode,
			appliedCouponDiscount: isHydrated ? appliedCouponDiscount : 0,
			setAppliedCoupon: store.setAppliedCoupon,
			clearAppliedCoupon: store.clearAppliedCoupon,
			currency: cartCurrency,
			country,
			exchangeRate: isHydrated ? exchangeRate : null,
		}),
		[
			store,
			isHydrated,
			cartSubtotal,
			appliedCouponDiscount,
			totals,
			totalItems,
			getPrice,
			quote,
			branchFeatureFlags,
			deliveryShowNumericFee,
			deliveryExternalHintText,
			pricingMode,
			branchPriceRows,
			cartCurrency,
			country,
			exchangeRate,
		],
	);

	return <CartContext.Provider value={contextValue}>{children}</CartContext.Provider>;
}
