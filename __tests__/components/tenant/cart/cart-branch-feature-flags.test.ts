import { describe, expect, it } from "vitest";

import { computeCartBranchFeatureFlags } from "@/components/tenant/cart/utils/cart-branch-feature-flags";

describe("computeCartBranchFeatureFlags", () => {
	it("defaults to false when settings missing or invalid", () => {
		expect(computeCartBranchFeatureFlags(null)).toEqual({
			extrasEnabledByBranch: false,
			beveragesUpsellEnabledByBranch: false,
		});
		expect(computeCartBranchFeatureFlags(undefined)).toEqual({
			extrasEnabledByBranch: false,
			beveragesUpsellEnabledByBranch: false,
		});
		expect(computeCartBranchFeatureFlags([])).toEqual({
			extrasEnabledByBranch: false,
			beveragesUpsellEnabledByBranch: false,
		});
	});

	it("reads camelCase and snake_case booleans", () => {
		expect(
			computeCartBranchFeatureFlags({
				extrasEnabledByBranch: true,
				beveragesUpsellEnabledByBranch: false,
			}),
		).toEqual({
			extrasEnabledByBranch: true,
			beveragesUpsellEnabledByBranch: false,
		});
		expect(
			computeCartBranchFeatureFlags({
				extras_enabled_by_branch: "true",
				beverages_upsell_enabled_by_branch: 1,
			}),
		).toEqual({
			extrasEnabledByBranch: true,
			beveragesUpsellEnabledByBranch: true,
		});
	});

	it("resolves per-branch map when selectedBranchId matches", () => {
		const branchId = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";
		expect(
			computeCartBranchFeatureFlags(
				{
					extrasEnabledByBranch: { other: false, [branchId]: true },
					beveragesUpsellEnabledByBranch: { [branchId]: "1" },
				},
				branchId,
			),
		).toEqual({
			extrasEnabledByBranch: true,
			beveragesUpsellEnabledByBranch: true,
		});
	});

	it("returns true if any branch entry is true when no selectedBranchId", () => {
		expect(
			computeCartBranchFeatureFlags({
				extrasEnabledByBranch: { a: false, b: true },
			}),
		).toEqual({
			extrasEnabledByBranch: true,
			beveragesUpsellEnabledByBranch: false,
		});
	});
});
