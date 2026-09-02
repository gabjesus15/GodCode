"use client";

import { memo } from "react";
import { useCartStore } from "../cart/cart-store";
import { LazyCartFloat, LazyCartModal } from "@/lib/tenant/lazy/tenant-dynamic";

import type { OrderChannelMode } from "@/lib/tenant/menu-settings";
import { resolveMenuCartUiMode } from "@/lib/tenant/menu/menu-helpers";
import type { BranchInfo } from "./menu-types";
import { MenuBottomNav } from "./menu-bottom-nav";
import type { BottomNavTab } from "./menu-types";

type MenuCartLayerProps = {
	selectedBranch: BranchInfo | null;
	showBottomNav: boolean;
	onlineOrderingEnabled?: boolean;
	orderChannel?: OrderChannelMode;
	effectiveCurrency: string;
	businessName: string;
	businessInfo?: {
		name?: string | null;
		address?: string | null;
		phone?: string | null;
		schedule?: string | null;
		bank_name?: string | null;
		account_type?: string | null;
		account_number?: string | null;
		account_rut?: string | null;
		account_email?: string | null;
		account_holder?: string | null;
	} | null;
	totalItems: number;
	activeBottomTab: BottomNavTab;
	showContactTab: boolean;
	showAccountTab?: boolean;
	onHome: () => void;
	onCart: () => void;
	onContact: () => void;
	onAccount?: () => void;
};

export const MenuCartLayer = memo(function MenuCartLayer({
	selectedBranch,
	showBottomNav,
	onlineOrderingEnabled,
	orderChannel = "both",
	effectiveCurrency,
	businessName,
	businessInfo,
	totalItems,
	activeBottomTab,
	showContactTab,
	showAccountTab,
	onHome,
	onCart,
	onContact,
	onAccount,
}: MenuCartLayerProps) {
	const isCartOpen = useCartStore((state) => state.isCartOpen);
	const mode = resolveMenuCartUiMode({
		hasBranch: Boolean(selectedBranch),
		onlineOrderingEnabled,
		showBottomNav,
	});

	if (mode === "none") return null;

	const bottomNav = showBottomNav ? (
		<MenuBottomNav
			activeTab={activeBottomTab}
			totalItems={totalItems}
			onlineOrderingEnabled={onlineOrderingEnabled}
			showContactTab={showContactTab}
			showAccountTab={showAccountTab}
			onHome={onHome}
			onCart={onCart}
			onContact={onContact}
			onAccount={onAccount}
		/>
	) : null;

	const cartModalProps = selectedBranch
		? {
			businessInfo: { name: businessName, ...(businessInfo ?? {}) },
			selectedBranch,
			currency: effectiveCurrency,
			orderChannel,
		}
		: null;

	if (mode === "bottom-nav-only") return bottomNav;

	if (mode === "bottom-nav" && cartModalProps) {
		return (
			<>
				{bottomNav}
				{isCartOpen ? <LazyCartModal {...cartModalProps} /> : null}
			</>
		);
	}

	if (mode === "float-with-modal" && cartModalProps) {
		return (
			<>
				<LazyCartFloat currency={effectiveCurrency} />
				{isCartOpen ? <LazyCartModal {...cartModalProps} /> : null}
			</>
		);
	}

	return null;
});
