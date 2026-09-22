import { describe, expect, it } from "vitest";

import {
	DELIVERY_QUOTE_INVALID_NAMED_AREA,
	resolveDeliveryQuoteState,
	type DeliveryQuoteInput,
} from "@/components/tenant/cart/utils/delivery-quote-state";
import { normalizeDeliverySettings } from "@/lib/delivery/delivery-settings";

const DISTANCE_SETTINGS = normalizeDeliverySettings({
	enabled: true,
	pricingStrategy: "distance",
	baseFee: 1000,
	pricePerKm: 500,
	maxDeliveryKm: 10,
	minOrderSubtotal: 5000,
});

const BASE: DeliveryQuoteInput = {
	isDelivery: true,
	settings: DISTANCE_SETTINGS,
	pricingMode: "distance",
	cartSubtotal: 12000,
	namedAreaId: null,
	quote: undefined,
	quoteFetching: false,
	quoteFetchError: null,
	haversineKm: 3.2,
	manualKm: Number.NaN,
};

describe("resolveDeliveryQuoteState", () => {
	it("is idle for pickup, disabled delivery or below the minimum order", () => {
		expect(resolveDeliveryQuoteState({ ...BASE, isDelivery: false }).deliveryFee).toBe(0);
		expect(
			resolveDeliveryQuoteState({
				...BASE,
				settings: normalizeDeliverySettings({ enabled: false }),
			}).quoteLoading,
		).toBe(false);
		const belowMin = resolveDeliveryQuoteState({ ...BASE, cartSubtotal: 100 });
		expect(belowMin).toMatchObject({ deliveryFee: 0, outOfZone: false, quoteError: null });
	});

	it("prefers the server quote when it exists", () => {
		const state = resolveDeliveryQuoteState({
			...BASE,
			quote: {
				ok: true,
				fee: 2500,
				waivedFree: false,
				namedLabel: "Centro",
				quotedRouteKm: 4,
				outOfZone: false,
				uberQuoteId: "uq-1",
			},
			quoteFetching: true,
		});
		expect(state).toMatchObject({
			deliveryFee: 2500,
			namedLabel: "Centro",
			quotedRouteKm: 4,
			quoteLoading: true,
			uberQuoteId: "uq-1",
		});
	});

	it("reports loading while the first quote is in flight", () => {
		const state = resolveDeliveryQuoteState({ ...BASE, quoteFetching: true });
		expect(state.quoteLoading).toBe(true);
		expect(state.deliveryFee).toBe(0);
	});

	it("falls back to a local distance estimate and flags the max distance", () => {
		const near = resolveDeliveryQuoteState(BASE);
		expect(near.outOfZone).toBe(false);
		expect(near.quotedRouteKm).toBe(3);
		expect(near.deliveryFee).toBeGreaterThan(0);

		const far = resolveDeliveryQuoteState({ ...BASE, haversineKm: 14 });
		expect(far.outOfZone).toBe(true);
		expect(far.deliveryFee).toBe(0);
	});

	it("uses the manual km when there are no coordinates", () => {
		const state = resolveDeliveryQuoteState({ ...BASE, haversineKm: null, manualKm: 2.4 });
		expect(state.quotedRouteKm).toBe(2);
	});

	it("marks an unknown named area with a translatable code", () => {
		const settings = normalizeDeliverySettings({
			enabled: true,
			pricingStrategy: "named_areas",
			namedAreaResolution: "manual_select",
			namedAreas: [{ id: "z1", name: "Centro", feeFlat: 1500 }],
		});
		const known = resolveDeliveryQuoteState({
			...BASE,
			settings,
			pricingMode: "named",
			namedAreaId: "z1",
		});
		expect(known.namedLabel).toBe("Centro");
		expect(known.quoteError).toBeNull();

		const unknown = resolveDeliveryQuoteState({
			...BASE,
			settings,
			pricingMode: "named",
			namedAreaId: "missing",
		});
		expect(unknown.quoteError).toBe(DELIVERY_QUOTE_INVALID_NAMED_AREA);
	});

	it("surfaces the fetch error when nothing else applies", () => {
		const settings = normalizeDeliverySettings({
			enabled: true,
			pricingStrategy: "external",
		});
		const state = resolveDeliveryQuoteState({
			...BASE,
			settings,
			pricingMode: "external",
			quoteFetchError: "Sin cobertura",
		});
		expect(state.quoteError).toBe("Sin cobertura");
	});
});
