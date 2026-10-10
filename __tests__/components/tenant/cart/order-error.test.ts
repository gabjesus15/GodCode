import { describe, expect, it } from "vitest";

import { OrderError, orderErrorCode, orderSubmitErrorMessage } from "@/components/tenant/cart/services/order-error";

/** `t` de `tenant.cart.modal`: devuelve la clave para ver cuál se pidió. */
const t = (key: string) => `[${key}]`;

describe("rechazos del pedido en el carrito", () => {
	it("la tienda sin abrir se avisa con el texto traducido, no con el español del servicio", () => {
		const error = new OrderError("store_not_open", "No se pueden recibir pedidos en este momento.");
		expect(orderErrorCode(error)).toBe("store_not_open");
		expect(orderSubmitErrorMessage(error, t)).toBe("[errors.noOrdersNow]");
	});

	it("los demás rechazos siguen con su propio texto", () => {
		expect(orderSubmitErrorMessage(new Error("Cupón no válido."), t)).toBe("Cupón no válido.");
		// El `code` de un error de PostgREST es un SQLSTATE: no se confunde con el nuestro.
		expect(orderErrorCode({ code: "P0001", message: "boom" })).toBeNull();
		expect(orderSubmitErrorMessage({ code: "P0001", message: "boom" }, t)).toBe("boom");
	});

	it("sin texto usable, el aviso genérico", () => {
		expect(orderSubmitErrorMessage(new Error(""), t)).toBe("[errors.processOrderTryAgain]");
		expect(orderSubmitErrorMessage(null, t)).toBe("[errors.processOrderTryAgain]");
		expect(orderSubmitErrorMessage("store_not_open", t)).toBe("[errors.processOrderTryAgain]");
		expect(orderErrorCode(undefined)).toBeNull();
	});

	it("es un Error de verdad, con nombre propio para el log", () => {
		const error = new OrderError("store_not_open", "x");
		expect(error).toBeInstanceOf(Error);
		expect(error.name).toBe("OrderError");
	});
});
