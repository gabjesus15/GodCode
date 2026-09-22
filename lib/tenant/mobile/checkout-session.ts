export type CheckoutEnhancePanel = "none" | "beverages" | "extras" | "coupon";

/** Qué paso del checkout está a la vista, derivado de la sesión. */
export type CheckoutStepFlags = {
	showPaymentInfo: boolean;
	showPaymentMethods: boolean;
	showForm: boolean;
};

export type CheckoutSessionState = {
	showPaymentInfo: boolean;
	showPaymentMethods: boolean;
	showForm: boolean;
	paymentMethodKey: string | null;
	activeEnhancePanel: CheckoutEnhancePanel;
	clientDraft: {
		name: string;
		phone: string;
		rut: string;
	};
};

export const DEFAULT_CHECKOUT_SESSION: CheckoutSessionState = {
	showPaymentInfo: false,
	showPaymentMethods: false,
	showForm: false,
	paymentMethodKey: null,
	activeEnhancePanel: "none",
	clientDraft: { name: "", phone: "", rut: "" },
};

export function checkoutSessionToViewFlags(
	session: CheckoutSessionState,
): CheckoutStepFlags {
	return {
		showPaymentInfo: session.showPaymentInfo,
		showPaymentMethods: session.showPaymentMethods,
		showForm: session.showForm,
	};
}

/** Profundidad de history por paso del checkout (carrito abierto en resumen = 1). */
export function getCartOverlayHistoryDepth(params: {
	isOpen: boolean;
	showSuccess: boolean;
	showPaymentInfo: boolean;
	showPaymentMethods: boolean;
	showForm: boolean;
}): number {
	if (!params.isOpen || params.showSuccess) return params.isOpen ? 1 : 0;
	if (!params.showPaymentInfo) return 1;
	if (!params.showPaymentMethods) return 2;
	if (!params.showForm) return 3;
	return 4;
}

export type CartCheckoutPopResult = "consumed" | "close-cart" | "ignored";

export type PopCartCheckoutOptions = {
	/**
	 * El método elegido no tiene pantalla de datos que copiar (efectivo, tarjeta):
	 * al volver desde el formulario se regresa a la lista de métodos y no a una
	 * pantalla intermedia que el cliente nunca vio.
	 */
	skipPaymentDetail?: boolean;
};

/** Retrocede un paso en el checkout; devuelve si el gesto atrás fue consumido. */
export function popCartCheckoutStep(
	session: CheckoutSessionState,
	options: PopCartCheckoutOptions = {},
): {
	next: CheckoutSessionState;
	result: CartCheckoutPopResult;
} {
	if (session.showForm) {
		return {
			next: options.skipPaymentDetail
				? { ...session, showForm: false, paymentMethodKey: null }
				: { ...session, showForm: false },
			result: "consumed",
		};
	}
	if (session.showPaymentMethods) {
		return {
			next: {
				...session,
				showPaymentMethods: false,
				showForm: false,
				paymentMethodKey: null,
			},
			result: "consumed",
		};
	}
	if (session.showPaymentInfo) {
		return {
			next: {
				...session,
				showPaymentInfo: false,
				showPaymentMethods: false,
				showForm: false,
				paymentMethodKey: null,
			},
			result: "consumed",
		};
	}
	return { next: session, result: "close-cart" };
}

export function resetCheckoutSessionToSummary(
	session: CheckoutSessionState,
): CheckoutSessionState {
	return {
		...session,
		showPaymentInfo: false,
		showPaymentMethods: false,
		showForm: false,
		paymentMethodKey: null,
		activeEnhancePanel: "none",
	};
}
