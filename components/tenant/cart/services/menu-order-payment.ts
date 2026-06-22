export const RECEIPT_REQUIRED_METHODS = new Set([
  "transferencia_bancaria",
  "pago_movil",
  "zelle",
]);

export function paymentMethodRequiresReceipt(method: string | null | undefined): boolean {
  if (!method) return false;
  return RECEIPT_REQUIRED_METHODS.has(method);
}

export type MenuOrderPaymentPayload = {
  payment_type: "pendiente" | "online";
  payment_method_specific: string;
  payment_ref: string;
};

/**
 * Builds RPC payment fields for menu checkout.
 * Callers requiring a receipt must validate/upload before invoking with receiptUrl.
 */
export function buildMenuOrderPaymentPayload(
  selectedMethod: string,
  receiptUrl?: string | null,
): MenuOrderPaymentPayload {
  if (receiptUrl) {
    return {
      payment_type: "online",
      payment_method_specific: selectedMethod,
      payment_ref: receiptUrl,
    };
  }

  return {
    payment_type: "pendiente",
    payment_method_specific: selectedMethod,
    payment_ref: "Pago Presencial",
  };
}
