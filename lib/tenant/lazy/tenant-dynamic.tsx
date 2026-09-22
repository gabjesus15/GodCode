"use client";

import { createClientDynamic } from "@/lib/lazy/create-client-dynamic";

export const LazyCartModal = createClientDynamic(
	() => import("@/components/tenant/cart").then((mod) => ({ default: mod.CartModal })),
);

export const LazyCartFloat = createClientDynamic(
	() => import("@/components/tenant/cart").then((mod) => ({ default: mod.CartFloat })),
);

export const LazyProductDetailsModal = createClientDynamic(
	() =>
		import("@/components/tenant/menu/product-details-sheet").then((mod) => ({
			default: mod.ProductDetailsSheet,
		})),
);

export const LazyContactBranchModal = createClientDynamic(
	() =>
		import("@/components/tenant/branch/contact-branch-modal").then((mod) => ({
			default: mod.ContactBranchModal,
		})),
);

export const LazyBranchSelectorModal = createClientDynamic(
	() =>
		import("@/components/tenant/branch/branch-selector-modal").then((mod) => ({
			default: mod.BranchSelectorModal,
		})),
);

export const LazyDeliveryPreviewMap = createClientDynamic(
	() =>
		import("@/components/tenant/delivery/delivery-preview-map").then((mod) => ({
			default: mod.DeliveryPreviewMap,
		})),
);
