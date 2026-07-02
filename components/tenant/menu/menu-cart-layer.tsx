"use client";

import { memo } from "react";
import dynamic from "next/dynamic";

import { resolveMenuCartUiMode } from "@/lib/tenant/menu/menu-helpers";
import type { BranchInfo } from "./menu-types";
import { MenuBottomNav } from "./menu-bottom-nav";
import type { BottomNavTab } from "./menu-types";

const CartFloat = dynamic(
	() => import("../cart").then((mod) => mod.CartFloat),
	{ ssr: false },
);

const CartModal = dynamic(
	() => import("../cart").then((mod) => mod.CartModal),
	{ ssr: false },
);

type MenuCartLayerProps = {
	selectedBranch: BranchInfo | null;
	showBottomNav: boolean;
	onlineOrderingEnabled?: boolean;
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
	onHome: () => void;
	onCart: () => void;
	onContact: () => void;
};

export const MenuCartLayer = memo(function MenuCartLayer({
	selectedBranch,
	showBottomNav,
	onlineOrderingEnabled,
	effectiveCurrency,
	businessName,
	businessInfo,
	totalItems,
	activeBottomTab,
	showContactTab,
	onHome,
	onCart,
	onContact,
}: MenuCartLayerProps) {
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
			onHome={onHome}
			onCart={onCart}
			onContact={onContact}
		/>
	) : null;

	if (mode === "bottom-nav-only") return bottomNav;

	if (mode === "bottom-nav" && selectedBranch) {
		return (
			<>
				{bottomNav}
				<CartModal
					businessInfo={{ name: businessName, ...(businessInfo ?? {}) }}
					selectedBranch={selectedBranch}
					currency={effectiveCurrency}
				/>
			</>
		);
	}

	if (mode === "float-with-modal" && selectedBranch) {
		return (
			<>
				<CartFloat currency={effectiveCurrency} />
				<CartModal
					businessInfo={{ name: businessName, ...(businessInfo ?? {}) }}
					selectedBranch={selectedBranch}
					currency={effectiveCurrency}
				/>
			</>
		);
	}

	return null;
});
