import { describe, expect, it } from "vitest";

import {
  buildMenuOrderPaymentPayload,
  paymentMethodRequiresReceipt,
} from "@/components/tenant/cart/services/menu-order-payment";

describe("paymentMethodRequiresReceipt", () => {
  it("returns true for manual transfer methods", () => {
    expect(paymentMethodRequiresReceipt("transferencia_bancaria")).toBe(true);
    expect(paymentMethodRequiresReceipt("pago_movil")).toBe(true);
    expect(paymentMethodRequiresReceipt("zelle")).toBe(true);
    expect(paymentMethodRequiresReceipt("paypal")).toBe(true);
  });

  it("returns false for in-store and gateway methods", () => {
    expect(paymentMethodRequiresReceipt("efectivo")).toBe(false);
    expect(paymentMethodRequiresReceipt("tarjeta")).toBe(false);
    expect(paymentMethodRequiresReceipt("stripe")).toBe(false);
    expect(paymentMethodRequiresReceipt(null)).toBe(false);
  });
});

describe("buildMenuOrderPaymentPayload", () => {
  it("builds pendiente payload for in-store methods without receipt", () => {
    expect(buildMenuOrderPaymentPayload("efectivo")).toEqual({
      payment_type: "pendiente",
      payment_method_specific: "efectivo",
      payment_ref: null,
    });
    expect(buildMenuOrderPaymentPayload("tarjeta")).toEqual({
      payment_type: "pendiente",
      payment_method_specific: "tarjeta",
      payment_ref: null,
    });
  });

  it("keeps the order pending when a receipt path is present", () => {
    const url = "https://cdn.example.com/receipts/abc.jpg";
    expect(buildMenuOrderPaymentPayload("transferencia_bancaria", url)).toEqual({
      payment_type: "pendiente",
      payment_method_specific: "transferencia_bancaria",
      payment_ref: null,
    });
  });

  it("builds pendiente payload for gateway methods without real charge", () => {
    expect(buildMenuOrderPaymentPayload("stripe")).toEqual({
      payment_type: "pendiente",
      payment_method_specific: "stripe",
      payment_ref: null,
    });
  });
});
