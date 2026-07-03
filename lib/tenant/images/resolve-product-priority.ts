import { TENANT_UI_CONFIG } from "@/lib/tenant/config/tenant-ui-config";

/** IDs de productos que reciben next/image priority (mismo resultado en SSR y cliente). */
export function buildPriorityProductIdSet(
	productIdsInRenderOrder: string[],
	max: number = TENANT_UI_CONFIG.priorityImageMax,
): ReadonlySet<string> {
	return new Set(productIdsInRenderOrder.slice(0, max));
}

export function isPriorityProductImage(
	productId: string,
	priorityProductIds: ReadonlySet<string>,
): boolean {
	return priorityProductIds.has(productId);
}
