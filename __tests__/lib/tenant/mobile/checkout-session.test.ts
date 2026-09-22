import { describe, expect, it } from "vitest";

import {
	DEFAULT_CHECKOUT_SESSION,
	getCartOverlayHistoryDepth,
	popCartCheckoutStep,
	resetCheckoutSessionToSummary,
} from "@/lib/tenant/mobile/checkout-session";

describe("checkout-session", () => {
	it("calcula profundidad de history por paso", () => {
		expect(
			getCartOverlayHistoryDepth({
				isOpen: true,
				showSuccess: false,
				showPaymentInfo: false,
				showPaymentMethods: false,
				showForm: false,
			}),
		).toBe(1);
		expect(
			getCartOverlayHistoryDepth({
				isOpen: true,
				showSuccess: false,
				showPaymentInfo: true,
				showPaymentMethods: true,
				showForm: true,
			}),
		).toBe(4);
	});

	it("retrocede pasos del checkout antes de cerrar carrito", () => {
		const fromPayment = {
			...DEFAULT_CHECKOUT_SESSION,
			showPaymentInfo: true,
			showPaymentMethods: true,
			showForm: true,
			paymentMethodKey: "pago_movil",
		};
		const step1 = popCartCheckoutStep(fromPayment);
		expect(step1.result).toBe("consumed");
		expect(step1.next.showForm).toBe(false);

		const step2 = popCartCheckoutStep(step1.next);
		expect(step2.result).toBe("consumed");
		expect(step2.next.showPaymentMethods).toBe(false);

		const step3 = popCartCheckoutStep(step2.next);
		expect(step3.result).toBe("consumed");
		expect(step3.next.showPaymentInfo).toBe(false);

		const step4 = popCartCheckoutStep(step3.next);
		expect(step4.result).toBe("close-cart");
	});

	it("desde el formulario vuelve a la lista cuando el metodo no tiene pantalla de datos", () => {
		const presencial = {
			...DEFAULT_CHECKOUT_SESSION,
			showPaymentInfo: true,
			showPaymentMethods: true,
			showForm: true,
			paymentMethodKey: "efectivo",
		};
		const back = popCartCheckoutStep(presencial, { skipPaymentDetail: true });
		expect(back.result).toBe("consumed");
		expect(back.next.showForm).toBe(false);
		expect(back.next.showPaymentMethods).toBe(true);
		// Sin metodo elegido el paso intermedio deja de existir: se ve la lista.
		expect(back.next.paymentMethodKey).toBeNull();
	});

	it("resetea al resumen al modificar productos", () => {
		const session = {
			...DEFAULT_CHECKOUT_SESSION,
			showPaymentInfo: true,
			showPaymentMethods: true,
			paymentMethodKey: "efectivo",
		};
		const reset = resetCheckoutSessionToSummary(session);
		expect(reset.showPaymentInfo).toBe(false);
		expect(reset.showPaymentMethods).toBe(false);
		expect(reset.paymentMethodKey).toBeNull();
	});
});
