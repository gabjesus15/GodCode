import type { CartFulfillment } from "../cart-context";
import { formatCartMoney } from "../utils/format-cart-money";
import { resolvePaymentAmountMessageValue } from "../utils/venezuela-payment-copy";

export type WsFulfillmentMeta = {
  fulfillment: CartFulfillment;
  cartSubtotal: number;
  deliveryFee: number;
  grandTotal: number;
  deliverySummary?: string;
  /** Referencia de la dirección («casa azul, timbre 2»). */
  deliveryReference?: string | null;
  /** Enlace de Google Maps para el repartidor. */
  deliveryMapsUrl?: string | null;
  /** Sucursal elegida; solo se muestra si el negocio tiene varias. */
  branchName?: string | null;
  orderId?: number | null;
  orderNumber?: number | null;
  handoffCode?: string | null;
  /**
   * Código corto para nombrar el pedido cuando no se guardó en el panel (solo WhatsApp):
   * el dueño y el cliente hablan del mismo pedido sin número.
   */
  webReference?: string | null;
  couponCode?: string | null;
  couponDiscount?: number;
  currency?: string;
  localCurrency?: string;
  localTotal?: number | null;
  taxTotal?: number;
  taxRate?: number | null;
  taxIncluded?: boolean | null;
  country?: string | null;
  exchangeRate?: number | null;
  paymentMethodKey?: string | null;
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
  /** Ya no se usa: el detalle de cada plato va en viñetas. Se mantiene por compatibilidad. */
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
  /** Pedido solo por WhatsApp: el comprobante va por el mismo chat. */
  bankTransferHintChat: string;
  note: string;
  couponLabel: string;
  taxLabel: string;
  taxIncluded: string;
  taxAdded: string;
  addressReference: string;
  mapLink: string;
  branch: string;
  webReference: string;
};

export const DEFAULT_WS_MESSAGE_COPY: WsMessageCopy = {
  titlePrefix: "Nuevo pedido",
  businessFallback: "Restaurante",
  customer: "Cliente",
  rut: "RUT",
  phone: "Teléfono",
  typeLabel: "Entrega",
  typeDelivery: "Delivery",
  typePickup: "Retiro en el local",
  shipping: "Envío",
  subtotalProducts: "Subtotal",
  orderNumber: "Pedido",
  orderId: "ID pedido",
  handoffCode: "Código de entrega",
  detail: "Pedido",
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
  bankTransferHintChat: "Cuando completes la transferencia, envía el comprobante por este chat.",
  note: "Nota",
  couponLabel: "Cupón",
  taxLabel: "Impuesto (IVA)",
  taxIncluded: "incluido",
  taxAdded: "adicional",
  addressReference: "Referencia",
  mapLink: "Ubicación",
  branch: "Sucursal",
  webReference: "Ref.",
};

/** Una línea del pedido tal como se lee en el mensaje. */
export type WsCartLine = {
  name?: string | null;
  quantity: number;
  /**
   * Formato anterior: un texto libre debajo del plato. Si llegan `details`, se ignora.
   */
  description?: string | null;
  /** Total de la línea (cantidad × unitario con sus extras). Sin él no se muestra precio. */
  lineTotal?: number | null;
  /** Viñetas debajo del plato: extras, bebidas, cambios y la nota del cliente. */
  details?: string[];
};

const SEPARATOR = "──────────────";

function clean(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Mensaje de WhatsApp que el cliente le envía al local. Pensado para que el dueño lo lea
 * de un vistazo en el teléfono y prepare el pedido sin preguntar nada: quién es, cómo se
 * entrega, qué lleva cada plato (con sus extras y notas) y cuánto cobrar.
 */
export function generateWSMessage(
  formData: { name: string; rut: string; phone: string },
  cart: WsCartLine[],
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
  const money = (amount: number) => formatCartMoney(amount, currency);
  const out: string[] = [];

  // Encabezado: a quién va y cómo se llama este pedido.
  out.push(`🛎️ *${c.titlePrefix} · ${clean(businessName) || c.businessFallback}*`);
  const ids: string[] = [];
  if (meta?.orderNumber != null) ids.push(`${c.orderNumber} #${meta.orderNumber}`);
  else if (meta?.orderId != null && meta.orderId > 0) ids.push(`${c.orderId}: ${meta.orderId}`);
  else if (meta?.webReference) ids.push(`${c.webReference} ${meta.webReference}`);
  if (meta?.handoffCode) ids.push(`${c.handoffCode}: *${meta.handoffCode}*`);
  if (ids.length) out.push(ids.join(" · "));
  out.push(SEPARATOR);

  // Cliente.
  out.push(`👤 *${c.customer}:* ${clean(formData.name)}`);
  if (clean(formData.phone)) out.push(`📞 ${c.phone}: ${clean(formData.phone)}`);
  if (clean(formData.rut)) out.push(`${c.rut}: ${clean(formData.rut)}`);
  out.push("");

  // Entrega.
  if (meta) {
    const isDelivery = meta.fulfillment === "delivery";
    out.push(isDelivery ? `🛵 *${c.typeDelivery}*` : `🏪 *${c.typePickup}*`);
    if (isDelivery && meta.deliverySummary) out.push(clean(meta.deliverySummary));
    if (isDelivery && clean(meta.deliveryReference)) {
      out.push(`${c.addressReference}: ${clean(meta.deliveryReference)}`);
    }
    if (isDelivery && meta.deliveryMapsUrl) out.push(`📍 ${c.mapLink}: ${meta.deliveryMapsUrl}`);
    if (clean(meta.branchName)) out.push(`${c.branch}: ${clean(meta.branchName)}`);
    out.push("");
  }

  // Detalle: cada plato en negrita con su total y, debajo, lo que hay que hacerle.
  out.push(`🧾 *${c.detail}*`);
  for (const item of cart) {
    const name = clean(item.name) || "—";
    const price = item.lineTotal != null && Number.isFinite(item.lineTotal) ? ` · ${money(item.lineTotal)}` : "";
    out.push(`*${item.quantity}x ${name}*${price}`);
    const details = item.details ?? (clean(item.description) ? [clean(item.description)] : []);
    for (const detail of details) {
      const text = clean(detail);
      if (text) out.push(`   ↳ ${text}`);
    }
  }
  out.push("");

  // Cuentas.
  if (meta) {
    out.push(`${c.subtotalProducts}: ${money(meta.cartSubtotal)}`);
    if (meta.fulfillment === "delivery" && meta.deliveryFee > 0) {
      out.push(`${c.shipping}: ${money(meta.deliveryFee)}`);
    }
    if (meta.couponDiscount != null && meta.couponDiscount > 0) {
      const suffix = meta.couponCode ? ` (${meta.couponCode})` : "";
      out.push(`${c.couponLabel}${suffix}: -${money(meta.couponDiscount)}`);
    }
    if (meta.taxTotal != null && meta.taxTotal > 0) {
      const rate = meta.taxRate ? `${meta.taxRate}%, ` : "";
      const mode = meta.taxIncluded ? c.taxIncluded : c.taxAdded;
      out.push(`${c.taxLabel} (${rate}${mode}): ${money(meta.taxTotal)}`);
    }
  }

  // Total según la moneda del método de pago (Venezuela) o doble en otros países.
  const totalLine = resolvePaymentAmountMessageValue({
    methodKey: paymentMethodKey ?? meta?.paymentMethodKey ?? null,
    grandTotal,
    currency,
    exchangeRate: meta?.exchangeRate,
    country: meta?.country,
    localTotal: meta?.localTotal,
    localCurrency: meta?.localCurrency,
  });
  out.push(`💰 *${c.total}: ${totalLine}*`);

  const methodLabel = paymentMethodLabel ?? paymentMethodKey ?? c.paymentUnknown;
  out.push(`💳 ${c.payment}: ${methodLabel}`);

  if (paymentMethodKey === "transferencia_bancaria" && paymentData) {
    const td = paymentData as Record<string, unknown>;
    const field = (key: string) => (typeof td[key] === "string" ? clean(td[key] as string) : "");
    out.push("");
    out.push(`*${c.bankTransferTitle}*`);
    if (field("banco")) out.push(`${c.bank}: ${field("banco")}`);
    if (field("tipo_cuenta")) out.push(`${c.accountType}: ${field("tipo_cuenta")}`);
    if (field("nro_cuenta")) out.push(`${c.account}: ${field("nro_cuenta")}`);
    if (field("titular")) out.push(`${c.holder}: ${field("titular")}`);
    out.push(meta?.webReference ? c.bankTransferHintChat : c.bankTransferHint);
  }

  if (note && note.trim()) {
    out.push("");
    out.push(`📝 ${c.note}: ${note.trim()}`);
  }

  return `${out.join("\n")}\n`;
}
