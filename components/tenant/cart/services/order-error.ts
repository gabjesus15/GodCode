/**
 * Rechazos del pedido con un código estable. `ordersService.createOrder` los lanza con un texto
 * en español (el de siempre, para el log); el carrito traduce el código con los textos de
 * `tenant.cart.modal`, en el idioma del menú.
 */

/**
 * La tienda no recibe pedidos: vista previa sin pagar, suspendida o vencida, o una sucursal de
 * otra empresa. Es el mismo `code` que responden las rutas del carrito (`STORE_NOT_OPEN_CODE`
 * en lib/tenant/store-draft-viewer, solo servidor) y el mensaje de la RPC.
 */
export const ORDER_STORE_NOT_OPEN = "store_not_open";

export type OrderErrorCode = typeof ORDER_STORE_NOT_OPEN;

export class OrderError extends Error {
	readonly code: OrderErrorCode;

	constructor(code: OrderErrorCode, message: string) {
		super(message);
		this.name = "OrderError";
		this.code = code;
	}
}

/** El código de un rechazo del pedido, o `null` si no trae uno conocido. */
export function orderErrorCode(error: unknown): OrderErrorCode | null {
	const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
	return code === ORDER_STORE_NOT_OPEN ? ORDER_STORE_NOT_OPEN : null;
}

/**
 * Lo que ve el cliente cuando el pedido no sale: el código conocido, en su idioma; si no, el
 * texto del error (los demás rechazos ya vienen redactados) o el genérico.
 */
export function orderSubmitErrorMessage(error: unknown, t: (key: string) => string): string {
	if (orderErrorCode(error) === ORDER_STORE_NOT_OPEN) return t("errors.noOrdersNow");
	const message = error && typeof error === "object" ? (error as { message?: unknown }).message : undefined;
	return typeof message === "string" && message ? message : t("errors.processOrderTryAgain");
}
