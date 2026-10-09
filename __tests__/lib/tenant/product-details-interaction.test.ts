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

	it("inline + layout-carta uses grid panel", () => {
		const result = resolveProductDetailsInteraction("inline", "layout-carta", noop);
		expect(result.productClickHandler).toBe(noop);
		expect(result.inlineDetails).toBe(false);
		expect(result.showLayoutInlinePanel).toBe(true);
	});

	it("las variantes de Cristal y sus alias despliegan dentro de la tarjeta", () => {
		for (const style of ["glass-row", "glass-plate", "glass-wide", "minimal", "layout-horizontal"]) {
			const result = resolveProductDetailsInteraction("inline", style, noop);
			expect(result.inlineDetails, style).toBe(true);
			expect(result.showLayoutInlinePanel, style).toBe(false);
		}
	});
});
