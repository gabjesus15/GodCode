import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { Banknote, Building, CreditCard, DollarSign, Smartphone } from "lucide-react";
import {
	ENHANCE_CATALOG_BEVERAGE_FALLBACK,
	ENHANCE_CATALOG_EXTRA_FALLBACK,
} from "@/lib/tenant/config/tenant-assets";

export { ENHANCE_CATALOG_BEVERAGE_FALLBACK, ENHANCE_CATALOG_EXTRA_FALLBACK };

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
