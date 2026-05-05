"use client";

import { useMemo } from "react";

import {
	computeCartBranchFeatureFlags,
	type CartBranchFeatureFlags,
} from "../utils/cart-branch-feature-flags";

export type { CartBranchFeatureFlags };

export function useCartBranchFeatureFlags(
	branchDeliverySettings: unknown,
	selectedBranchId?: string | null,
): CartBranchFeatureFlags {
	return useMemo(
		() => computeCartBranchFeatureFlags(branchDeliverySettings, selectedBranchId),
		[branchDeliverySettings, selectedBranchId],
	);
}
