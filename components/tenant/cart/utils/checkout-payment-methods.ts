import {
	resolveDeliveryPaymentMethodsForCheckout,
	type CheckoutFulfillment,
	type DeliverySettingsNormalized,
} from "@/lib/delivery/delivery-settings";

/**
 * `branches.efectivo` y `branches.tarjeta` llegan como boolean, objeto o JSON
 * serializado según la versión del panel que los guardó. Un objeto vacío (o su
 * forma serializada "{}") significa "sin configurar", no "activo".
 */
export function isPresentialMethodConfigured(value: unknown): boolean {
	if (value == null) return false;
	if (typeof value === "string") {
		const text = value.trim();
		if (!text) return false;
		try {
			const parsed: unknown = JSON.parse(text);
			if (parsed && typeof parsed === "object") {
				return Object.keys(parsed as Record<string, unknown>).length > 0;
			}
			return Boolean(parsed);
		} catch {
			return text !== "{}";
		}
	}
	if (typeof value === "object") {
		return Object.keys(value as Record<string, unknown>).length > 0;
	}
	return Boolean(value);
}

export type BranchPaymentSource = {
	payment_methods?: string[] | null;
	efectivo?: unknown;
	tarjeta?: unknown;
};

/** Métodos activos de la sucursal: la lista explícita más los presenciales configurados aparte. */
export function resolveBranchPaymentMethods(
	branch: BranchPaymentSource | null | undefined,
): string[] {
	const base = (Array.isArray(branch?.payment_methods) ? branch.payment_methods : []).filter(
		(method): method is string => typeof method === "string" && method.trim().length > 0,
	);
	if (isPresentialMethodConfigured(branch?.efectivo) && !base.includes("efectivo")) {
		base.push("efectivo");
	}
	if (isPresentialMethodConfigured(branch?.tarjeta) && !base.includes("tarjeta")) {
		base.push("tarjeta");
	}
	return Array.from(new Set(base));
}

/** Métodos que el cliente puede elegir para la forma de entrega actual. */
export function resolveCheckoutPaymentMethods(
	branch: BranchPaymentSource | null | undefined,
	settings: DeliverySettingsNormalized,
	fulfillment: CheckoutFulfillment,
): string[] {
	return resolveDeliveryPaymentMethodsForCheckout(
		resolveBranchPaymentMethods(branch),
		settings,
		fulfillment,
	);
}
