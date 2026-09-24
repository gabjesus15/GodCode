/**
 * Datos de cobro que cada sucursal enseña al cliente del menú en el paso de pago.
 *
 * Todo lo que se guarda en estas columnas es PÚBLICO: el menú las lee con la clave
 * anónima y el carrito las pinta en pantalla. Por eso cada método tiene una lista
 * cerrada de campos y cualquier otro (claves de API, tokens o secretos que pedían
 * versiones anteriores del formulario) se descarta al guardar y al leer.
 *
 * Stripe ya no es un método de sucursal: su columna se vacía y el slug se quita de
 * `payment_methods`.
 */
import { mergePaymentJsonField } from "./merge-payment-json-field";

export const BRANCH_PAYMENT_PUBLIC_FIELDS = {
	pago_movil: ["banco", "telefono", "identificacion"],
	zelle: ["email", "name"],
	transferencia_bancaria: ["banco", "tipo_cuenta", "nro_cuenta", "identificacion", "titular", "email"],
	mercadopago: ["link", "alias"],
	paypal: ["email", "link"],
} as const satisfies Record<string, readonly string[]>;

export type BranchPaymentConfigColumn = keyof typeof BRANCH_PAYMENT_PUBLIC_FIELDS;

/** Métodos que ya no se ofrecen en sucursal (sus datos se descartan). */
export const RETIRED_BRANCH_PAYMENT_METHODS = ["stripe"] as const;

const CONFIG_COLUMNS = [
	...(Object.keys(BRANCH_PAYMENT_PUBLIC_FIELDS) as BranchPaymentConfigColumn[]),
	...RETIRED_BRANCH_PAYMENT_METHODS,
];

function parseConfig(value: unknown): Record<string, unknown> | null {
	if (value == null) return null;
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (!trimmed) return null;
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			return parsed && typeof parsed === "object" && !Array.isArray(parsed)
				? (parsed as Record<string, unknown>)
				: null;
		} catch {
			return null;
		}
	}
	return typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** Solo los campos públicos del método con valor; `null` si no queda ninguno. */
export function pickPublicPaymentConfig(column: string, value: unknown): Record<string, string> | null {
	const allowed: readonly string[] | undefined = BRANCH_PAYMENT_PUBLIC_FIELDS[column as BranchPaymentConfigColumn];
	if (!allowed) return null;
	const parsed = parseConfig(value);
	if (!parsed) return null;

	const out: Record<string, string> = {};
	for (const key of allowed) {
		const raw = parsed[key];
		if (typeof raw === "string" && raw.trim()) out[key] = raw.trim();
	}
	return Object.keys(out).length > 0 ? out : null;
}

/**
 * Valor a guardar en una columna de cobro: solo campos públicos. Si el formulario manda
 * el método vacío se conservan los datos públicos que ya había (nunca los secretos).
 */
export function mergePublicPaymentConfig(column: string, incoming: unknown, existing: unknown): string | null {
	return mergePaymentJsonField(pickPublicPaymentConfig(column, incoming), pickPublicPaymentConfig(column, existing));
}

/** `payment_methods` sin los métodos retirados ni valores vacíos o repetidos. */
export function sanitizeBranchPaymentMethods(methods: unknown): string[] | null {
	if (!Array.isArray(methods)) return null;
	const retired: readonly string[] = RETIRED_BRANCH_PAYMENT_METHODS;
	const clean = methods
		.map((method) => String(method ?? "").trim())
		.filter((method) => method && !retired.includes(method));
	return [...new Set(clean)];
}

/**
 * Copia de la fila de sucursal apta para el navegador: cada JSON de cobro queda con sus
 * campos públicos (conserva el formato de entrada, texto u objeto) y los métodos
 * retirados desaparecen. Las columnas que la fila no trae no se añaden.
 */
export function sanitizeBranchPaymentConfig<T extends object>(branch: T): T {
	const next = { ...branch } as Record<string, unknown>;
	for (const column of CONFIG_COLUMNS) {
		if (!(column in next)) continue;
		const original = next[column];
		const picked = pickPublicPaymentConfig(column, original);
		next[column] = picked == null ? null : typeof original === "string" ? JSON.stringify(picked) : picked;
	}
	if ("payment_methods" in next && next.payment_methods != null) {
		next.payment_methods = sanitizeBranchPaymentMethods(next.payment_methods);
	}
	return next as T;
}
