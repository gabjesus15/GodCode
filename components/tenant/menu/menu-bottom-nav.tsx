"use client";

import { memo } from "react";
import { Home, MessageCircle, ShoppingBag, UserRound } from "lucide-react";

import type { BottomNavTab } from "./menu-types";

type MenuBottomNavProps = {
	activeTab: BottomNavTab;
	totalItems: number;
	onlineOrderingEnabled?: boolean;
	showContactTab: boolean;
	showAccountTab?: boolean;
	onHome: () => void;
	onCart: () => void;
	onContact: () => void;
	onAccount?: () => void;
};

export const MenuBottomNav = memo(function MenuBottomNav({
	activeTab,
	totalItems,
	onlineOrderingEnabled,
	showContactTab,
	showAccountTab = false,
	onHome,
	onCart,
	onContact,
	onAccount,
}: MenuBottomNavProps) {
	const itemCount =
		1 +
		(onlineOrderingEnabled !== false ? 1 : 0) +
		(showContactTab ? 1 : 0) +
		(showAccountTab ? 1 : 0);

	return (
		<div className={`bottom-floating-navbar bottom-floating-navbar--count-${itemCount}`}>
			<button
				type="button"
				className={`bottom-nav-item ${activeTab === "home" ? "active-nav-circle" : ""}`}
				onClick={onHome}
				aria-label="Inicio"
			>
				<span className="bottom-nav-icon-wrap" aria-hidden>
					<Home size={24} strokeWidth={2} />
				</span>
				<span className="bottom-nav-label">Inicio</span>
			</button>

			{onlineOrderingEnabled !== false && (
				<button
					type="button"
					className={`bottom-nav-item ${activeTab === "cart" ? "active-nav-circle" : ""}`}
					onClick={onCart}
					aria-label={totalItems > 0 ? `Carrito, ${totalItems} productos` : "Carrito"}
				>
					<span className="bottom-nav-icon-wrap" aria-hidden>
						<ShoppingBag size={24} strokeWidth={2} />
						{totalItems > 0 && (
							<span className="bottom-nav-cart-badge">{totalItems > 99 ? "99+" : totalItems}</span>
						)}
					</span>
					<span className="bottom-nav-label">Carrito</span>
				</button>
			)}

			{showContactTab && (
				<button
					type="button"
					className={`bottom-nav-item ${activeTab === "contact" ? "active-nav-circle" : ""}`}
					onClick={onContact}
					aria-label="Contacto"
				>
					<span className="bottom-nav-icon-wrap" aria-hidden>
						<MessageCircle size={24} strokeWidth={2} />
					</span>
					<span className="bottom-nav-label">Contacto</span>
				</button>
			)}

			{showAccountTab && (
				<button
					type="button"
					className={`bottom-nav-item ${activeTab === "account" ? "active-nav-circle" : ""}`}
					onClick={onAccount}
					aria-label="Mi cuenta"
				>
					<span className="bottom-nav-icon-wrap" aria-hidden>
						<UserRound size={24} strokeWidth={2} />
					</span>
					<span className="bottom-nav-label">Mi cuenta</span>
				</button>
			)}
		</div>
	);
});
