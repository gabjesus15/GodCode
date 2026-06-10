import type { CartFulfillment } from "../cart-context";
import { formatCartMoney } from "../utils/format-cart-money";

export type WsFulfillmentMeta = {
  fulfillment: CartFulfillment;
  cartSubtotal: number;
  deliveryFee: number;
  grandTotal: number;
  deliverySummary?: string;
  orderId?: number | null;
  orderNumber?: number | null;
  handoffCode?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  currency?: string;
  localCurrency?: string;
  localTotal?: number | null;
  taxTotal?: number;
  taxRate?: number | null;
  taxIncluded?: boolean | null;
};

export type WsMessageCopy = {
  titlePrefix: string;
  businessFallback: string;
  customer: string;
  rut: string;
  phone: string;
  typeLabel: string;
  typeDelivery: string;
  typePickup: string;
  shipping: string;
  subtotalProducts: string;
  orderNumber: string;
  orderId: string;
  handoffCode: string;
  detail: string;
  doLabel: string;
  total: string;
  payment: string;
  paymentUnknown: string;
  bankTransferTitle: string;
  bank: string;
  accountType: string;
  account: string;
  holder: string;
  bankTransferHint: string;
  note: string;
  couponLabel: string;
  taxLabel: string;
};

export const DEFAULT_WS_MESSAGE_COPY: WsMessageCopy = {
  titlePrefix: "NUEVO PEDIDO WEB",
  businessFallback: "RESTAURANTE",
  customer: "Cliente",
  rut: "RUT",
  phone: "Fono",
  typeLabel: "Tipo",
  typeDelivery: "DELIVERY",
  typePickup: "RETIRO EN LOCAL",
  shipping: "Envio",
  subtotalProducts: "Subtotal productos",
  orderNumber: "N pedido",
  orderId: "ID pedido",
  handoffCode: "Codigo de entrega",
  detail: "DETALLE",
  doLabel: "Hacer",
  total: "TOTAL",
  payment: "Pago",
  paymentUnknown: "Por definir",
  bankTransferTitle: "Transferencia bancaria",
  bank: "Banco",
  accountType: "Tipo",
  account: "Cuenta",
  holder: "Titular",
  bankTransferHint: "Cuando completes la transferencia, adjunta el comprobante en tu pedido.",
  note: "Nota",
  couponLabel: "Cupón",
  taxLabel: "Impuesto (IVA)",
};

export function generateWSMessage(
  formData: { name: string; rut: string; phone: string },
  cart: Array<{ name?: string | null; quantity: number; description?: string | null }>,
  grandTotal: number,
  paymentMethodKey: string | null,
  note: string,
  businessName?: string | null,
  paymentData?: unknown,
  meta?: WsFulfillmentMeta,
  copy?: Partial<WsMessageCopy>,
  paymentMethodLabel?: string,
): string {
  const c: WsMessageCopy = { ...DEFAULT_WS_MESSAGE_COPY, ...(copy ?? {}) };
  const currency = meta?.currency || "CLP";
  
  let msg = `*${c.titlePrefix} - ${businessName || c.businessFallback}*\n`;
  msg += "================================\n\n";
  msg += `${c.customer}: ${formData.name}\n`;
  if (formData.rut && formData.rut.trim()) {
    msg += `${c.rut}: ${formData.rut}\n`;
  }
  msg += `${c.phone}: ${formData.phone}\n\n`;
  
  if (meta) {
    msg += `${c.typeLabel}: ${meta.fulfillment === "delivery" ? c.typeDelivery : c.typePickup}\n`;
    if (meta.fulfillment === "delivery" && meta.deliverySummary) {
      msg += `${meta.deliverySummary}\n`;
    }
    if (meta.fulfillment === "delivery" && meta.deliveryFee > 0) {
      msg += `${c.shipping}: ${formatCartMoney(meta.deliveryFee, currency)}\n`;
    }
    msg += `${c.subtotalProducts}: ${formatCartMoney(meta.cartSubtotal, currency)}\n`;
    
    // Desglose de cupones
    if (meta.couponDiscount != null && meta.couponDiscount > 0) {
      const suffix = meta.couponCode ? ` (${meta.couponCode})` : "";
      msg += `${c.couponLabel}${suffix}: -${formatCartMoney(meta.couponDiscount, currency)}\n`;
    }
    
    // Desglose de Impuestos (IVA)
    if (meta.taxTotal != null && meta.taxTotal > 0) {
      const isInc = meta.taxIncluded ?? false;
      const rateStr = meta.taxRate ? ` (${meta.taxRate}%)` : "";
      const incStr = isInc ? " (Incluido)" : " (Adicional)";
      msg += `${c.taxLabel}${rateStr}${incStr}: ${formatCartMoney(meta.taxTotal, currency)}\n`;
    }

    if (meta.orderNumber != null) msg += `${c.orderNumber}: #${meta.orderNumber}\n`;
    else if (meta.orderId != null) msg += `${c.orderId}: ${meta.orderId}\n`;
    if (meta.handoffCode) msg += `${c.handoffCode}: ${meta.handoffCode}\n`;
    msg += "\n";
  }
  
  msg += `${c.detail}:\n`;
  cart.forEach((item) => {
    msg += `+ ${item.quantity} x ${(item.name ?? "").toUpperCase()}\n`;
    if (item.description) {
      msg += `   (${c.doLabel}: ${item.description})\n`;
    }
  });
  
  // Imprimir total dual
  if (meta?.localTotal != null && meta.localTotal > 0 && meta.localCurrency) {
    msg += `\n*${c.total}: ${formatCartMoney(grandTotal, currency)} (${formatCartMoney(meta.localTotal, meta.localCurrency)})*\n`;
  } else {
    msg += `\n*${c.total}: ${formatCartMoney(grandTotal, currency)}*\n`;
  }
  
  const methodLabel = paymentMethodLabel ?? paymentMethodKey ?? c.paymentUnknown;
  msg += `${c.payment}: ${methodLabel}\n`;

  if (paymentMethodKey === "transferencia_bancaria" && paymentData) {
    const td = paymentData as Record<string, unknown>;
    const banco = typeof td.banco === "string" ? td.banco : "";
    const nroCuenta = typeof td.nro_cuenta === "string" ? td.nro_cuenta : "";
    const tipoCuenta = typeof td.tipo_cuenta === "string" ? td.tipo_cuenta : "";
    const titular = typeof td.titular === "string" ? td.titular : "";
    msg += `\n*${c.bankTransferTitle}*\n`;
    if (banco) msg += `${c.bank}: ${banco}\n`;
    if (tipoCuenta) msg += `${c.accountType}: ${tipoCuenta}\n`;
    if (nroCuenta) msg += `${c.account}: ${nroCuenta}\n`;
    if (titular) msg += `${c.holder}: ${titular}\n`;
    msg += `\n${c.bankTransferHint}\n`;
  }

  if (note && note.trim()) msg += `\n${c.note}: ${note}\n`;
  return msg;
}
