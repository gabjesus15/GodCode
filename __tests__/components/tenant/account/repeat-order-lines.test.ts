import { describe, expect, it, vi } from "vitest";

// `sanitizeUserText` usa DOMPurify (necesita DOM); igual que en build-order-payload.test.
vi.mock("@/utils/sanitize-user-text", () => ({
	sanitizeUserText: (text: string | null | undefined) =>
		String(text ?? "")
			.trim()
			.replace(/[<>]/g, ""),
}));

import { buildRepeatCartLines } from "@/components/tenant/account/repeat-order-lines";
import type { MenuAccountOrder, MenuAccountOrderItem } from "@/components/tenant/account/menu-account-types";
import { buildCatalogOrderLines } from "@/components/tenant/cart/services/build-order-payload";
import type { CartLineItem } from "@/components/tenant/cart/cart-modal-types";

function item(overrides: Partial<MenuAccountOrderItem>): MenuAccountOrderItem {
	return {
		productId: "bf23d0b4-bb84-4a9a-ad92-cdafdc750683",
		name: "Chicken hot",
		quantity: 1,
		unitPrice: 6000,
		extras: [],
		note: null,
		lineTotal: 6000,
		...overrides,
	};
}

/** El pedido #3307 de Oishi: un roll y una bebida sugerida con nota. */
const ORDER = {
	items: [
		item({ note: "Sin queso crema" }),
		item({
			productId: "bebida-mnm58r7yf0xa",
			beverage: true,
			name: "bebidas de 2 litro",
			unitPrice: 2800,
			lineTotal: 2800,
			note: "Pepsi zero",
		}),
		item({ productId: null, name: "Línea manual" }),
	],
} as MenuAccountOrder;

describe("buildRepeatCartLines", () => {
	it("deja los productos como estaban y salta las líneas sin producto", () => {
		const [roll, , ...rest] = buildRepeatCartLines(ORDER, 0);
		expect(rest).toHaveLength(0);
		expect(roll).toMatchObject({
			id: "bf23d0b4-bb84-4a9a-ad92-cdafdc750683",
			price: 6000,
			selected_beverages: [],
			line_note: "Sin queso crema",
		});
	});

	it("rearma la bebida sugerida como la agrega el carrito, con su nota", () => {
		const [, bebida] = buildRepeatCartLines(ORDER, 0);
		expect(bebida).toMatchObject({
			id: "upsell_beverage_bebida-mnm58r7yf0xa",
			price: 2800,
			quantity: 1,
			selected_beverages: [{ id: "bebida-mnm58r7yf0xa", name: "bebidas de 2 litro", price: 2800, qty: 1 }],
			line_note: "Pepsi zero",
		});
	});

	it("la bebida repetida sale al checkout como bebida sugerida (custom_item), no se pierde", () => {
		const lines = buildCatalogOrderLines(buildRepeatCartLines(ORDER, 0) as CartLineItem[]);
		const bebida = lines.find((line) => line.name === "bebidas de 2 litro");
		expect(bebida).toMatchObject({ custom_item: true, price: 2800, extras: [] });
		expect(bebida?.description).toContain("Pepsi zero");
	});
});
