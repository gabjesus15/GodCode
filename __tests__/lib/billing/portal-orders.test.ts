import { describe, expect, it } from "vitest";

import {
	classifyPortalPaymentReference,
	describePortalOrder,
	isOpenOrder,
	isOrderAwaitingPayment,
	isSubscriptionOrderKind,
} from "@/lib/billing/portal-orders";

const ADDON_ID = "3f0c9b1e-7a51-4c1b-9d3e-2b8f6a4c5d10";

describe("classifyPortalPaymentReference", () => {
	it("reconoce cada tipo de pedido por su referencia", () => {
		expect(classifyPortalPaymentReference("PLANCHG-1727000000000-ABCD1234")).toEqual({ kind: "plan_change" });
		expect(classifyPortalPaymentReference("RENEW-1727000000000-ABCD1234")).toEqual({ kind: "renewal" });
		expect(classifyPortalPaymentReference("CUST-1727000000000-ABCD1234")).toEqual({ kind: "branch_expansion" });
		expect(classifyPortalPaymentReference(`ADDON-${ADDON_ID.toUpperCase()}-M1-ABCD1234`)).toEqual({ kind: "addon", addonId: ADDON_ID });
	});

	it("los pagos del alta (órdenes de PayPal, transferencias) no son pedidos del portal", () => {
		expect(classifyPortalPaymentReference("8XY12345AB678901C")).toBeNull();
		expect(classifyPortalPaymentReference("ADDON-no-es-uuid-M1-X")).toBeNull();
		expect(classifyPortalPaymentReference(null)).toBeNull();
	});
});

describe("estado de un pedido", () => {
	const order = (status: string, receipt: string | null = null) => ({
		status,
		payment_reference: "RENEW-1-X",
		reference_file_url: receipt,
	});

	it("abiertos: por pagar, en revisión o rechazados", () => {
		expect(isOpenOrder(order("pending"))).toBe(true);
		expect(isOpenOrder(order("pending_validation", "https://x/comprobante.png"))).toBe(true);
		expect(isOpenOrder(order("rejected"))).toBe(true);
		expect(isOpenOrder(order("paid"))).toBe(false);
		expect(isOpenOrder(order("cancelled"))).toBe(false);
		expect(isOpenOrder({ status: "pending", payment_reference: "8XY12345AB678901C" })).toBe(false);
	});

	it("se puede pagar mientras nadie revise un comprobante", () => {
		expect(isOrderAwaitingPayment(order("pending"))).toBe(true);
		expect(isOrderAwaitingPayment(order("rejected"))).toBe(true);
		// Sin la migración de estados el pedido nace "pending_validation" sin comprobante.
		expect(isOrderAwaitingPayment(order("pending_validation"))).toBe(true);
		expect(isOrderAwaitingPayment(order("pending_validation", "https://x/comprobante.png"))).toBe(false);
		expect(isOrderAwaitingPayment(order("paid"))).toBe(false);
	});

	it("renovar y cambiar de plan comparten el límite de un pedido abierto", () => {
		expect(isSubscriptionOrderKind("renewal")).toBe(true);
		expect(isSubscriptionOrderKind("plan_change")).toBe(true);
		expect(isSubscriptionOrderKind("addon")).toBe(false);
	});
});

describe("describePortalOrder", () => {
	const names = { plan: () => "Pro", addon: () => "Dominio propio" };

	it("dice qué se compra", () => {
		expect(describePortalOrder({ status: "pending", payment_reference: "RENEW-1-X", plan_id: "p", months_paid: 3 }, names)).toBe(
			"Renovación Pro · 3 meses",
		);
		expect(describePortalOrder({ status: "pending", payment_reference: "PLANCHG-1-X", plan_id: "p" }, names)).toBe("Cambio al plan Pro");
		expect(describePortalOrder({ status: "pending", payment_reference: `ADDON-${ADDON_ID}-M1-X` }, names)).toBe("Extra: Dominio propio");
		expect(describePortalOrder({ status: "pending", payment_reference: "CUST-1-X" }, names)).toBe("Sucursales extra");
	});

	it("sin nombres usa un texto genérico", () => {
		expect(describePortalOrder({ status: "paid", payment_reference: "RENEW-1-X", months_paid: 1 })).toBe("Renovación · 1 mes");
		expect(describePortalOrder({ status: "paid", payment_reference: "8XY12345AB678901C" })).toBe("Pago de suscripción");
	});
});
