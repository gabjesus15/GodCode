"use client";

import { useCallback, useMemo } from "react";
import { useCartStore } from "../cart-store";
import {
	getCartOverlayHistoryDepth,
	popCartCheckoutStep,
	checkoutSessionToViewFlags,
} from "@/lib/tenant/mobile/checkout-session";
import {
	useOverlayHistoryDepthSync,
	useOverlayHistoryHandler,
} from "@/lib/tenant/mobile/overlay-history";

import { TENANT_OVERLAY_PRIORITIES } from "@/lib/tenant/config/tenant-ui-config";

export function useCartCheckoutFlow(options: {
	isCartOpen: boolean;
	showSuccess: boolean;
}) {
	const checkoutSession = useCartStore((state) => state.checkoutSession);
	const patchCheckoutSession = useCartStore((state) => state.patchCheckoutSession);
	const resetCheckoutSession = useCartStore((state) => state.resetCheckoutSession);
	const closeCart = useCartStore((state) => state.closeCart);
	const openCart = useCartStore((state) => state.openCart);

	const stepFlags = useMemo(
		() => checkoutSessionToViewFlags(checkoutSession),
		[checkoutSession],
	);

	const historyDepth = useMemo(
		() =>
			getCartOverlayHistoryDepth({
				isOpen: options.isCartOpen,
				showSuccess: options.showSuccess,
				...stepFlags,
				showForm: checkoutSession.showForm,
			}),
		[checkoutSession.showForm, options.isCartOpen, options.showSuccess, stepFlags],
	);

	useOverlayHistoryDepthSync(historyDepth, "cart");

	const goBackCheckoutStep = useCallback(() => {
		const { next, result } = popCartCheckoutStep(checkoutSession);
		if (result === "consumed") {
			patchCheckoutSession?.(next);
			return true;
		}
		if (result === "close-cart") {
			closeCart?.();
			return true;
		}
		return false;
	}, [checkoutSession, closeCart, patchCheckoutSession]);

	const dismissCart = useCallback(() => {
		closeCart?.();
	}, [closeCart]);

	const toggleCartPreservingSession = useCallback(() => {
		if (options.isCartOpen) {
			dismissCart();
			return;
		}
		openCart?.();
	}, [dismissCart, openCart, options.isCartOpen]);

	useOverlayHistoryHandler({
		id: "cart",
		priority: TENANT_OVERLAY_PRIORITIES.cart,
		isActive: () => options.isCartOpen && !options.showSuccess,
		onPop: goBackCheckoutStep,
	});

	return {
		checkoutSession,
		patchCheckoutSession,
		resetCheckoutSession,
		stepFlags,
		goBackCheckoutStep,
		dismissCart,
		toggleCartPreservingSession,
		paymentMethodKey: checkoutSession.paymentMethodKey,
		setPaymentMethodKey: (key: string | null) => patchCheckoutSession?.({ paymentMethodKey: key }),
		activeEnhancePanel: checkoutSession.activeEnhancePanel,
		setActiveEnhancePanel: (panel: typeof checkoutSession.activeEnhancePanel) =>
			patchCheckoutSession?.({ activeEnhancePanel: panel }),
	};
}
