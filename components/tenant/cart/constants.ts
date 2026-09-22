import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";
import { Banknote, CreditCard, Landmark, Smartphone } from "lucide-react";
import {
	ENHANCE_CATALOG_BEVERAGE_FALLBACK,
	ENHANCE_CATALOG_EXTRA_FALLBACK,
} from "@/lib/tenant/config/tenant-assets";

export { ENHANCE_CATALOG_BEVERAGE_FALLBACK, ENHANCE_CATALOG_EXTRA_FALLBACK };

export type PaymentMethodConfig = {
	/** Icono de trazo para los métodos genéricos; las marcas usan `mark`. */
	icon?: ComponentType<LucideProps>;
	/** Sigla de la marca (Zelle, Stripe, Mercado Pago, PayPal) en su color. */
	mark?: string;
	/** Color propio del método: tiñe el azulejo y pinta el icono o la sigla. */
	color: string;
	isOnline: boolean;
};

export const PAYMENT_METHOD_CONFIG: Record<string, PaymentMethodConfig> = {
	efectivo: { icon: Banknote, color: "#2e9e5b", isOnline: false },
	tarjeta: { icon: CreditCard, color: "#2f6fed", isOnline: false },
	pago_movil: { icon: Smartphone, color: "#7c3aed", isOnline: true },
	zelle: { mark: "Z", color: "#6d1ed4", isOnline: true },
	transferencia_bancaria: { icon: Landmark, color: "#0f8a7d", isOnline: true },
	stripe: { mark: "S", color: "#635bff", isOnline: true },
	mercadopago: { mark: "MP", color: "#009ee3", isOnline: true },
	paypal: { mark: "P", color: "#1f8ce6", isOnline: true },
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
