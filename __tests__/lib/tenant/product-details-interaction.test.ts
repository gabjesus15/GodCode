import { describe, expect, it } from "vitest";

import { resolveProductDetailsInteraction } from "@/lib/tenant/menu/product-details-interaction";

describe("resolveProductDetailsInteraction", () => {
	const noop = () => {};

	it("modal-premium always wires product click handler", () => {
		const result = resolveProductDetailsInteraction("modal-premium", "glass", noop);
		expect(result.productClickHandler).toBe(noop);
		expect(result.inlineDetails).toBe(false);
		expect(result.showLayoutInlinePanel).toBe(false);
	});

	it("inline + glass uses internal expand", () => {
		const result = resolveProductDetailsInteraction("inline", "glass", noop);
		expect(result.productClickHandler).toBeUndefined();
		expect(result.inlineDetails).toBe(true);
		expect(result.showLayoutInlinePanel).toBe(false);
	});

	it("inline + layout-clean uses grid panel", () => {
		const result = resolveProductDetailsInteraction("inline", "layout-clean", noop);
		expect(result.productClickHandler).toBe(noop);
		expect(result.inlineDetails).toBe(false);
		expect(result.showLayoutInlinePanel).toBe(true);
	});

	it("normalizes card style aliases", () => {
		const result = resolveProductDetailsInteraction("inline", "minimal", noop);
		expect(result.showLayoutInlinePanel).toBe(true);
	});
});
