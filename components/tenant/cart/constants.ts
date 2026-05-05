import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { Banknote, Building, CreditCard, DollarSign, Smartphone } from "lucide-react";

export const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80";

/** Fallback catálogo carrito: bebidas (sin imagen propia) */
export const ENHANCE_CATALOG_BEVERAGE_FALLBACK =
  "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=200&q=80";
/** Fallback catálogo carrito: extras globales (sin imagen propia) */
export const ENHANCE_CATALOG_EXTRA_FALLBACK =
  "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=200&q=80";

export const PAYMENT_METHOD_CONFIG: Record<string, { icon: ComponentType<LucideProps>; isOnline: boolean }> = {
  efectivo: { icon: Banknote, isOnline: false },
  tarjeta: { icon: CreditCard, isOnline: false },
  pago_movil: { icon: Smartphone, isOnline: true },
  zelle: { icon: DollarSign, isOnline: true },
  transferencia_bancaria: { icon: Building, isOnline: true },
  stripe: { icon: CreditCard, isOnline: true },
  mercadopago: { icon: CreditCard, isOnline: true },
  paypal: { icon: DollarSign, isOnline: true },
};

export const PAYMENT_METHOD_LABEL_BY_KEY: Record<string, string> = {
  efectivo: "paymentMethods.efectivo",
  tarjeta: "paymentMethods.tarjeta",
  pago_movil: "paymentMethods.pago_movil",
  zelle: "paymentMethods.zelle",
  transferencia_bancaria: "paymentMethods.transferencia_bancaria",
  stripe: "paymentMethods.stripe",
  mercadopago: "paymentMethods.mercadopago",
  paypal: "paymentMethods.paypal",
};

export function resolvePaymentMethodLabel(
  methodKey: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!methodKey) return t("paymentMethods.unknown");
  const labelKey = PAYMENT_METHOD_LABEL_BY_KEY[methodKey];
  return labelKey ? t(labelKey) : methodKey;
}
