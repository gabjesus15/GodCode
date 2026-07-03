import { describe, expect, it } from "vitest";

import {
	buildPriorityProductIdSet,
	isPriorityProductImage,
} from "@/lib/tenant/images/resolve-product-priority";
import { collectCatalogProductIdsInRenderOrder } from "@/lib/tenant/menu/collect-catalog-product-ids";
import { TENANT_UI_CONFIG } from "@/lib/tenant/config/tenant-ui-config";

describe("resolve-product-priority", () => {
	it("marks only the first priorityImageMax product ids", () => {
		const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
		const priorityIds = buildPriorityProductIdSet(ids);

		expect(priorityIds.size).toBe(TENANT_UI_CONFIG.priorityImageMax);
		expect(isPriorityProductImage("a", priorityIds)).toBe(true);
		expect(isPriorityProductImage("f", priorityIds)).toBe(true);
		expect(isPriorityProductImage("g", priorityIds)).toBe(false);
	});

	it("collects catalog ids in stable render order", () => {
		const ids = collectCatalogProductIdsInRenderOrder({
			query: "",
			navigationMode: "scroll",
			activeCategory: null,
			specialProducts: [{ id: "special-1" } as never],
			visibleCategories: [{ id: "cat-1" }, { id: "cat-2" }],
			productsByCategory: new Map([
				["cat-1", [{ id: "p-1" } as never, { id: "p-2" } as never]],
				["cat-2", [{ id: "p-3" } as never]],
			]),
			filteredBySearch: [],
		});

		expect(ids).toEqual(["special-1", "p-1", "p-2", "p-3"]);
	});
});
