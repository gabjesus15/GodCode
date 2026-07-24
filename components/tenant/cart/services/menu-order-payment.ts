export const RECEIPT_REQUIRED_METHODS = new Set([
  "transferencia_bancaria",
  "pago_movil",
  "zelle",
  "paypal",
]);

export type MenuPaymentMethodPolicy = {
  id: string;
  requiresReceipt: boolean;
  rail: "cash" | "card" | "online";
  settlementTrigger:
    | "cash_confirmation"
    | "pos_confirmation"
    | "evidence_uploaded"
    | "manual_verification"
    | "gateway_webhook";
  settlementCurrency?: string | null;
  allowMixedPayment?: boolean;
};

export function paymentMethodRequiresReceipt(
  method: string | null | undefined,
  configuredMethods?: ReadonlySet<string> | null,
): boolean {
  if (!method) return false;
  if (configuredMethods) return configuredMethods.has(method);
  return RECEIPT_REQUIRED_METHODS.has(method);
}

export type MenuOrderPaymentPayload = {
  payment_type: "pendiente";
  payment_method_specific: string;
  payment_ref: null;
};

/**
 * El método elegido en el menú es una preferencia de cobro, no una liquidación.
 * El comprobante se vincula después a order_payment_evidence. Solo la política
 * persistida del método puede liquidarlo; el navegador nunca lo marca pagado.
 */
export function buildMenuOrderPaymentPayload(
  selectedMethod: string,
  _receiptPath?: string | null,
): MenuOrderPaymentPayload {
  return {
    payment_type: "pendiente",
    payment_method_specific: selectedMethod,
    payment_ref: null,
  };
}
