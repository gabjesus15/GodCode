"use client";

import { useCallback, useMemo } from "react";

import {
	checkoutSessionToViewFlags,
	getCartOverlayHistoryDepth,
	popCartCheckoutStep,
	type CheckoutEnhancePanel,
} from "@/lib/tenant/mobile/checkout-session";
import {
	useOverlayHistoryDepthSync,
	useOverlayHistoryHandler,
} from "@/lib/tenant/mobile/overlay-history";
import { TENANT_OVERLAY_PRIORITIES } from "@/lib/tenant/config/tenant-ui-config";
import { useCartStore } from "../cart-store";

export type UseCartCheckoutFlowOptions = {
	isCartOpen: boolean;
	showSuccess: boolean;
	/**
	 * Si el método tiene una pantalla de datos entre "elegir método" y "tus datos".
	 * Los presenciales no tienen nada que copiar, así que se la saltan: eso cambia
	 * tanto el botón "Volver" como el gesto atrás del navegador.
	 */
	hasPaymentDetailStep: (key: string | null) => boolean;
};

/** Pasos del checkout (viven en el store) + integración con el botón "atrás" del navegador. */
export function useCartCheckoutFlow({
	isCartOpen,
	showSuccess,
	hasPaymentDetailStep,
}: UseCartCheckoutFlowOptions) {
	const checkoutSession = useCartStore((state) => state.checkoutSession);
	const patchCheckoutSession = useCartStore((state) => state.patchCheckoutSession);
	const resetCheckoutSession = useCartStore((state) => state.resetCheckoutSession);
	const closeCart = useCartStore((state) => state.closeCart);

	const stepFlags = useMemo(() => checkoutSessionToViewFlags(checkoutSession), [checkoutSession]);

	const historyDepth = useMemo(
		() =>
			getCartOverlayHistoryDepth({
				isOpen: isCartOpen,
				showSuccess,
				...stepFlags,
				showForm: checkoutSession.showForm,
			}),
		[checkoutSession.showForm, isCartOpen, showSuccess, stepFlags],
	);

	useOverlayHistoryDepthSync(historyDepth, "cart");

	const skipPaymentDetail = !hasPaymentDetailStep(checkoutSession.paymentMethodKey);

	const goBackCheckoutStep = useCallback(() => {
		const { next, result } = popCartCheckoutStep(checkoutSession, { skipPaymentDetail });
		if (result === "consumed") {
			patchCheckoutSession(next);
			return true;
		}
		if (result === "close-cart") {
			closeCart();
			return true;
		}
		return false;
	}, [checkoutSession, closeCart, patchCheckoutSession, skipPaymentDetail]);

	useOverlayHistoryHandler({
		id: "cart",
		priority: TENANT_OVERLAY_PRIORITIES.cart,
		isActive: () => isCartOpen && !showSuccess,
		onPop: goBackCheckoutStep,
	});

	const setPaymentMethodKey = useCallback(
		(key: string | null) => patchCheckoutSession({ paymentMethodKey: key }),
		[patchCheckoutSession],
	);
	/** Elegir método: los presenciales entran directo a "Tus datos". */
	const pickPaymentMethod = useCallback(
		(key: string) =>
			patchCheckoutSession({ paymentMethodKey: key, showForm: !hasPaymentDetailStep(key) }),
		[hasPaymentDetailStep, patchCheckoutSession],
	);
	const setActiveEnhancePanel = useCallback(
		(panel: CheckoutEnhancePanel) => patchCheckoutSession({ activeEnhancePanel: panel }),
		[patchCheckoutSession],
	);

	return {
		checkoutSession,
		patchCheckoutSession,
		resetCheckoutSession,
		stepFlags,
		goBackCheckoutStep,
		dismissCart: closeCart,
		paymentMethodKey: checkoutSession.paymentMethodKey,
		setPaymentMethodKey,
		pickPaymentMethod,
		skipPaymentDetail,
		activeEnhancePanel: checkoutSession.activeEnhancePanel,
		setActiveEnhancePanel,
	};
}
