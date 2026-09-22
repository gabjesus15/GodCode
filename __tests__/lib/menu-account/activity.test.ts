import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/infra/supabase-admin", () => ({ supabaseAdmin: {} }));

import { cleanOrderNote, mapOrderItems } from "@/lib/menu-account/activity";

describe("mapOrderItems", () => {
	it("calcula el total de línea como el RPC: (precio + extras) × cantidad", () => {
		const [item] = mapOrderItems([
			{
				name: "Gohan de Pollo",
				quantity: 3,
				price: 7000,
				extras: [{ name: "salsa soya", qty: 1, price: 800 }],
				extras_total: 800,
				note: null,
				is_extra: false,
			},
		]);
		expect(item).toMatchObject({
			name: "Gohan de Pollo",
			quantity: 3,
			unitPrice: 7000,
			lineTotal: 23400,
			extras: [{ name: "salsa soya", quantity: 1, price: 800 }],
			note: null,
		});
	});

	it("usa el precio con descuento cuando el producto lo tiene", () => {
		const [item] = mapOrderItems([
			{ name: "Promo", quantity: 2, price: 10000, has_discount: true, discount_price: 8000, extras: [] },
		]);
		expect(item.unitPrice).toBe(8000);
		expect(item.lineTotal).toBe(16000);
	});

	it("ignora extras sueltos, filas sin nombre y datos que no son lista", () => {
		expect(mapOrderItems(null)).toEqual([]);
		expect(
			mapOrderItems([{ name: "Extra", is_extra: true }, { quantity: 1 }, "basura", { name: "Roll", price: 5000 }]),
		).toHaveLength(1);
	});
});

describe("cleanOrderNote", () => {
	it("quita las etiquetas internas y deja lo que escribió la persona", () => {
		expect(
			cleanOrderNote("[Sucursal: Pudahuel] \nGohan de Pollo: 2 teriyaki\n[Envio: $2.500]"),
		).toBe("Gohan de Pollo: 2 teriyaki");
	});

	it("devuelve null si solo había etiquetas", () => {
		expect(cleanOrderNote("[Sucursal: Pudahuel]")).toBeNull();
		expect(cleanOrderNote(null)).toBeNull();
	});
});
