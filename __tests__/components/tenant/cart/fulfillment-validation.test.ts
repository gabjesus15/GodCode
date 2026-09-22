import { describe, expect, it } from "vitest";

import {
	evaluateFulfillment,
	MIN_DRIVER_REFERENCE_LEN,
	parseManualKm,
	type FulfillmentInput,
} from "@/components/tenant/cart/utils/fulfillment-validation";

const READY_DISTANCE: FulfillmentInput = {
	fulfillment: "delivery",
	deliveryEnabled: true,
	pricingMode: "distance",
	namedAreaResolution: "manual_select",
	minOrderSubtotal: 5000,
	cartSubtotal: 12000,
	line1: "Av. Italia 1432",
	area: "Ñuñoa",
	reference: "Porton verde, timbre 2",
	lat: -33.45,
	lng: -70.6,
	namedAreaId: null,
	namedAreaLabel: null,
	kmManual: "",
	quoteLoading: false,
	quoteError: null,
	outOfZone: false,
};

describe("evaluateFulfillment", () => {
	it("always lets pickup through", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, fulfillment: "pickup", line1: "" });
		expect(result.canProceed).toBe(true);
		expect(result.blocker).toBeNull();
	});

	it("lets delivery through when the branch has delivery disabled", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, deliveryEnabled: false, line1: "" });
		expect(result.canProceed).toBe(true);
	});

	it("passes a complete distance-mode delivery", () => {
		const result = evaluateFulfillment(READY_DISTANCE);
		expect(result.canProceed).toBe(true);
		expect(result.blocker).toBeNull();
		expect(result.mapAddressMode).toBe(true);
	});

	it("asks for the location before anything else", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, line1: "Av", lat: null, lng: null });
		expect(result.canProceed).toBe(false);
		expect(result.blocker).toEqual({ code: "need_location", external: false });
	});

	it("flags the external provider in the location blocker", () => {
		const result = evaluateFulfillment({
			...READY_DISTANCE,
			pricingMode: "external",
			lat: null,
			lng: null,
		});
		expect(result.blocker).toEqual({ code: "need_location", external: true });
	});

	it("requires driver instructions of a minimum length", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, reference: "ok" });
		expect(result.blocker).toEqual({
			code: "need_driver_instructions",
			min: MIN_DRIVER_REFERENCE_LEN,
		});
	});

	it("reports out of zone before the minimum order", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, outOfZone: true, cartSubtotal: 10 });
		expect(result.blocker).toEqual({ code: "out_of_zone" });
	});

	it("reports the minimum order with its amount", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, cartSubtotal: 4999 });
		expect(result.blocker).toEqual({ code: "below_min_order", minOrder: 5000 });
		expect(result.meetsMinOrder).toBe(false);
	});

	it("waits for a running quote when it already has coordinates", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, quoteLoading: true });
		expect(result.blocker).toEqual({ code: "quote_loading" });
	});

	it("surfaces quote errors verbatim", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, quoteError: "Sin cobertura" });
		expect(result.blocker).toEqual({ code: "quote_error", message: "Sin cobertura" });
	});

	it("accepts manual km when there are no coordinates in distance mode", () => {
		const result = evaluateFulfillment({ ...READY_DISTANCE, lat: null, lng: null, kmManual: "2,5" });
		expect(result.canProceed).toBe(true);
	});

	it("blocks named areas with manual selection until a zone is picked", () => {
		const base: FulfillmentInput = {
			...READY_DISTANCE,
			pricingMode: "named",
			namedAreaResolution: "manual_select",
			lat: null,
			lng: null,
		};
		expect(evaluateFulfillment(base).blocker).toEqual({ code: "incomplete" });
		expect(evaluateFulfillment({ ...base, namedAreaId: "zona-1" }).canProceed).toBe(true);
	});

	it("blocks address-matched named areas until the server resolves a zone", () => {
		const base: FulfillmentInput = {
			...READY_DISTANCE,
			pricingMode: "named",
			namedAreaResolution: "address_matched",
			lat: null,
			lng: null,
		};
		expect(evaluateFulfillment(base).blocker).toEqual({ code: "incomplete" });
		expect(evaluateFulfillment({ ...base, namedAreaLabel: "Centro" }).canProceed).toBe(true);
	});
});

describe("parseManualKm", () => {
	it("accepts comma and dot decimals and rejects negatives", () => {
		expect(parseManualKm("2,5")).toBe(2.5);
		expect(parseManualKm("2.5")).toBe(2.5);
		expect(parseManualKm("")).toBe(0);
		expect(Number.isNaN(parseManualKm("-1"))).toBe(true);
		expect(Number.isNaN(parseManualKm("abc"))).toBe(true);
	});
});
