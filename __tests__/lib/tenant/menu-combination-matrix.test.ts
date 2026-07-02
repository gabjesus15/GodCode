import { describe, expect, it } from "vitest";

import {
	NAVBAR_TYPES,
	NAVIGATION_MODES,
	PRODUCT_CARD_STYLES,
	PRODUCT_DETAILS_MODES,
} from "@/lib/store-theme/theme-config";
import { resolveProductDetailsInteraction } from "@/lib/tenant/menu/product-details-interaction";

/**
 * Matrix: navbar × navMode × card × details = 180 combinations.
 * Interaction rules are card×details only; this test covers all 18 card×details pairs.
 */
describe("menu theme combination matrix (card × details)", () => {
	const noop = () => {};

	for (const cardStyle of PRODUCT_CARD_STYLES) {
		for (const detailsMode of PRODUCT_DETAILS_MODES) {
			it(`${cardStyle} + ${detailsMode} resolves interaction`, () => {
				const result = resolveProductDetailsInteraction(detailsMode, cardStyle, noop);

				if (detailsMode === "modal-premium") {
					expect(result.productClickHandler).toBe(noop);
					expect(result.inlineDetails).toBe(false);
					expect(result.showLayoutInlinePanel).toBe(false);
					return;
				}

				if (cardStyle === "glass") {
					expect(result.inlineDetails).toBe(true);
					expect(result.showLayoutInlinePanel).toBe(false);
					expect(result.productClickHandler).toBeUndefined();
					return;
				}

				expect(result.inlineDetails).toBe(false);
				expect(result.showLayoutInlinePanel).toBe(true);
				expect(result.productClickHandler).toBe(noop);
			});
		}
	}

	it("exports full navbar and navigation mode lists for QA checklist", () => {
		expect(NAVBAR_TYPES.length * NAVIGATION_MODES.length * PRODUCT_CARD_STYLES.length * PRODUCT_DETAILS_MODES.length).toBe(180);
	});
});
