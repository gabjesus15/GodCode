import { describe, expect, it } from "vitest";

import { calculateCartTotals } from "@/components/tenant/cart/utils/cart-pricing";

/**
 * `calculateCartTotals` produce lo que el cliente ve antes de confirmar el
 * pedido. La RPC `create_order_transaction` recalcula al persistir, pero un
 * total corrupto en pantalla ya es un problema aunque el servidor acierte:
 * el cliente decide con lo que ve.
 */
describe("calculateCartTotals", () => {
	it("calcula el caso normal", () => {
		expect(calculateCartTotals({ subtotal: 100, discountAmount: 10, deliveryFee: 5 })).toMatchObject({
			subtotal: 100,
			discountTotal: 10,
			deliveryFee: 5,
			total: 95,
		});
	});

	describe("entradas no finitas", () => {
		// currency() propaga NaN sin avisar: antes de sanear, un subtotal corrupto
		// salía como `total: NaN` hasta la interfaz.
		it.each([
			["subtotal", { subtotal: Number.NaN, discountAmount: 0, deliveryFee: 0 }],
			["descuento", { subtotal: 100, discountAmount: Number.NaN, deliveryFee: 0 }],
			["envío", { subtotal: 100, discountAmount: 0, deliveryFee: Number.NaN }],
		])("un %s NaN nunca produce un total NaN", (_campo, params) => {
			const result = calculateCartTotals(params);
			expect(Number.isFinite(result.total)).toBe(true);
			expect(Number.isFinite(result.subtotal)).toBe(true);
			expect(Number.isFinite(result.discountTotal)).toBe(true);
			expect(Number.isFinite(result.deliveryFee)).toBe(true);
		});

		it("un subtotal no numérico cuenta como cero", () => {
			const result = calculateCartTotals({
				subtotal: "abc" as unknown as number,
				discountAmount: 0,
				deliveryFee: 0,
			});
			expect(result.total).toBe(0);
		});
	});

	describe("importes negativos", () => {
		it("un descuento negativo no sube el total", () => {
			const result = calculateCartTotals({ subtotal: 100, discountAmount: -50, deliveryFee: 0 });
			expect(result.discountTotal).toBe(0);
			expect(result.total).toBe(100);
		});

		it("una tarifa de envío negativa no baja el total", () => {
			const result = calculateCartTotals({ subtotal: 100, discountAmount: 0, deliveryFee: -30 });
			expect(result.deliveryFee).toBe(0);
			expect(result.total).toBe(100);
		});

		it("un subtotal negativo cuenta como cero", () => {
			const result = calculateCartTotals({ subtotal: -50, discountAmount: 0, deliveryFee: 0 });
			expect(result.subtotal).toBe(0);
			expect(result.total).toBe(0);
		});
	});

	describe("descuento mayor que el subtotal", () => {
		it("no deja el total por debajo del envío", () => {
			const result = calculateCartTotals({ subtotal: 10, discountAmount: 999, deliveryFee: 3 });
			expect(result.total).toBe(3);
		});

		it("informa el descuento realmente aplicado, no el pedido", () => {
			const result = calculateCartTotals({ subtotal: 10, discountAmount: 999, deliveryFee: 3 });
			expect(result.discountTotal).toBe(10);
		});
	});

	describe("porcentaje de impuesto", () => {
		it("aplica IVA excluido sobre el subtotal, no sobre el envío", () => {
			expect(
				calculateCartTotals({ subtotal: 100, discountAmount: 0, deliveryFee: 5, taxRate: 19, taxIncluded: false }),
			).toMatchObject({ taxTotal: 19, total: 124 });
		});

		it("extrae el IVA incluido sin alterar el total", () => {
			expect(
				calculateCartTotals({ subtotal: 119, discountAmount: 0, deliveryFee: 5, taxRate: 19, taxIncluded: true }),
			).toMatchObject({ taxTotal: 19, total: 124 });
		});

		// El Panel POS ya acotaba con parseOptionalTaxRate; aquí no había cota
		// superior y un taxRate de 1000 multiplicaba el total por once.
		it("acota el porcentaje a 100", () => {
			const result = calculateCartTotals({ subtotal: 100, discountAmount: 0, deliveryFee: 0, taxRate: 1000 });
			expect(result.taxTotal).toBe(100);
			expect(result.total).toBe(200);
		});

		it.each([
			["negativo", -19],
			["NaN", Number.NaN],
			["cero", 0],
		])("un porcentaje %s no aplica impuesto", (_caso, taxRate) => {
			const result = calculateCartTotals({ subtotal: 100, discountAmount: 0, deliveryFee: 0, taxRate });
			expect(result.taxTotal).toBe(0);
			expect(result.total).toBe(100);
		});
	});

	describe("conversión de divisa", () => {
		it("convierte cuando hay tasa", () => {
			const result = calculateCartTotals({ subtotal: 100, discountAmount: 0, deliveryFee: 0, exchangeRate: 36.5 });
			expect(result.localTotal).toBe(3650);
		});

		it.each([
			["NaN", Number.NaN],
			["negativa", -3],
			["cero", 0],
		])("una tasa %s no produce total local", (_caso, exchangeRate) => {
			expect(
				calculateCartTotals({ subtotal: 100, discountAmount: 0, deliveryFee: 0, exchangeRate }).localTotal,
			).toBeNull();
		});
	});

	it("nunca devuelve un total negativo", () => {
		const result = calculateCartTotals({ subtotal: 10, discountAmount: 999, deliveryFee: 0 });
		expect(result.total).toBeGreaterThanOrEqual(0);
	});
});
