import { describe, expect, it, vi } from "vitest";

// `sanitizeUserText` usa DOMPurify (necesita DOM); en node replicamos su contrato: trim + sin HTML.
vi.mock("@/utils/sanitize-user-text", () => ({
	sanitizeUserText: (text: string | null | undefined) =>
		String(text ?? "")
			.trim()
			.replace(/<[^>]*>/g, ""),
}));

import {
	buildCatalogOrderLines,
	buildDeliverySnapshot,
	buildGlobalExtraOrderLines,
	buildLineNotesBlock,
	buildOrderPayload,
	resolveDeliveryKmForOrder,
	type BuildOrderPayloadInput,
	type DeliverySnapshotInput,
} from "@/components/tenant/cart/services/build-order-payload";
import type { CartLineItem } from "@/components/tenant/cart/cart-modal-types";

const PIZZA: CartLineItem = {
	id: "11111111-1111-4111-8111-111111111111",
	lineId: "l1",
	name: "Suprema",
	quantity: 2,
	price: 15,
	has_discount: true,
	discount_price: 12,
	description: "Base napolitana",
	selected_extras: [{ id: "x1", name: "Queso", price: 500, qty: 1 }],
	selected_beverages: [{ id: "b1", name: "Coca", price: 1000, qty: 2 }],
	line_note: "  sin cebolla ",
};

const DELIVERY: DeliverySnapshotInput = {
	isDelivery: true,
	pricingMode: "distance",
	line1: "Av. Italia 1432",
	area: "Ñuñoa",
	reference: "Porton verde",
	lat: -33.4,
	lng: -70.6,
	namedAreaId: null,
	namedAreaLabel: null,
	quotedRouteKm: 3.4,
	kmManual: "",
};

describe("buildCatalogOrderLines", () => {
	it("folds extras, beverages and the note into the description", () => {
		const [line] = buildCatalogOrderLines([PIZZA]);
		expect(line.description).toBe(
			"Base napolitana | Extras: 1x Queso | Bebidas: 2x Coca | Nota: sin cebolla",
		);
		expect(line.extras_total).toBe(2500);
		expect(line.extras).toHaveLength(2);
		expect(line.custom_item).toBe(false);
		expect(line.discount_price).toBe(12);
		expect(line.quantity).toBe(2);
	});

	it("marks upsell beverages as custom lines and ignores their nested beverages", () => {
		const [line] = buildCatalogOrderLines([
			{ ...PIZZA, id: "upsell_beverage_b1", selected_extras: [], line_note: null },
		]);
		expect(line.custom_item).toBe(true);
		expect(line.extras).toEqual([]);
		expect(line.description).toBe("Base napolitana");
	});
});

describe("buildGlobalExtraOrderLines / buildLineNotesBlock", () => {
	it("creates one custom line per global extra", () => {
		const lines = buildGlobalExtraOrderLines(
			[{ id: "g1", name: "Cubiertos", price: 200, qty: 0 }],
			{ fallbackName: "Extra", description: "Extra del pedido" },
		);
		expect(lines).toEqual([
			{
				id: "global_extra_0_g1",
				name: "Cubiertos",
				quantity: 1,
				price: 200,
				has_discount: false,
				discount_price: null,
				description: "Extra del pedido",
				extras_total: 0,
				extras: [],
				custom_item: true,
			},
		]);
	});

	it("joins line notes as 'name: note'", () => {
		expect(buildLineNotesBlock([PIZZA, { ...PIZZA, lineId: "l2", line_note: "" }])).toBe(
			"Suprema: sin cebolla",
		);
	});
});

describe("resolveDeliveryKmForOrder / buildDeliverySnapshot", () => {
	it("uses the quoted km, then the manual km, only in distance mode", () => {
		expect(resolveDeliveryKmForOrder(DELIVERY)).toBe(3);
		expect(resolveDeliveryKmForOrder({ ...DELIVERY, quotedRouteKm: null, kmManual: "2,6" })).toBe(3);
		expect(resolveDeliveryKmForOrder({ ...DELIVERY, pricingMode: "named" })).toBe(0);
		expect(resolveDeliveryKmForOrder({ ...DELIVERY, isDelivery: false })).toBe(0);
	});

	it("returns null for pickup and a clean address for delivery", () => {
		expect(buildDeliverySnapshot({ ...DELIVERY, isDelivery: false })).toBeNull();
		expect(buildDeliverySnapshot(DELIVERY)).toEqual({
			address: "Av. Italia 1432, Ñuñoa",
			formatted_address: "Av. Italia 1432, Ñuñoa",
			line1: "Av. Italia 1432",
			commune: "Ñuñoa",
			reference: "Porton verde",
			lat: -33.4,
			lng: -70.6,
			delivery_km: 3,
		});
	});

	it("omits optional keys instead of sending empty values", () => {
		const snapshot = buildDeliverySnapshot({
			...DELIVERY,
			area: "",
			reference: "  ",
			quotedRouteKm: null,
			pricingMode: "named",
			namedAreaId: " zona-1 ",
			namedAreaLabel: "Centro",
		});
		expect(snapshot).toEqual({
			address: "Av. Italia 1432",
			formatted_address: "Av. Italia 1432",
			line1: "Av. Italia 1432",
			commune: "",
			lat: -33.4,
			lng: -70.6,
			named_area_id: "zona-1",
			named_area_label: "Centro",
		});
	});
});

describe("buildOrderPayload", () => {
	const input: BuildOrderPayloadInput = {
		clientRequestId: "req-1",
		client: { name: " Ana ", phone: " +56 9 1111 ", rut: " 1-9 " },
		paymentMethodKey: "efectivo",
		requiresReceipt: false,
		cart: [PIZZA],
		globalExtras: [{ id: "g1", name: "Cubiertos", price: 200, qty: 1 }],
		globalExtraCopy: { fallbackName: "Extra", description: "Extra del pedido" },
		fulfillment: "delivery",
		deliveryEnabled: true,
		delivery: DELIVERY,
		totals: { grandTotal: 30200, deliveryFee: 1500 },
		branch: { id: "br-1", name: "", company_id: "co-1", currency: null },
		branchNameFallback: "Desconocido",
		currency: "CLP",
		uberQuoteId: null,
		couponCode: " BIENVENIDO ",
	};

	it("assembles the RPC payload for a delivery order", () => {
		const payload = buildOrderPayload(input);
		expect(payload.client_phone).toBe("+56 9 1111");
		expect(payload.client_rut).toBe("1-9");
		expect(payload.items).toHaveLength(2);
		expect(payload.order_type).toBe("delivery");
		expect(payload.delivery_fee).toBe(1500);
		expect(payload.delivery_km).toBe(3);
		expect(payload.delivery_address?.address).toBe("Av. Italia 1432, Ñuñoa");
		expect(payload.branch_name).toBe("Desconocido");
		expect(payload.currency).toBe("CLP");
		expect(payload.coupon_code).toBe("BIENVENIDO");
		expect(payload.note).toBe("Suprema: sin cebolla");
		expect(payload.status).toBe("pending");
	});

	it("drops every delivery field when the branch has delivery disabled", () => {
		const payload = buildOrderPayload({ ...input, deliveryEnabled: false });
		expect(payload.order_type).toBe("pickup");
		expect(payload.delivery_address).toBeNull();
		expect(payload.delivery_fee).toBe(0);
		expect(payload.delivery_km).toBe(0);
	});
});
