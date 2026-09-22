"use client";

import { memo } from "react";
import { Home, MapPin, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

import type { BottomNavTab, BranchInfo } from "./menu-types";

type MenuBottomNavProps = {
	activeTab: BottomNavTab;
	totalItems: number;
	onlineOrderingEnabled?: boolean;
	showContactTab: boolean;
	/**
	 * El selector de sucursal baja aqui cuando esta barra esta a la vista, en vez
	 * de ocupar una linea en el header. Es una accion, no una pestana: abre un
	 * dialogo, asi que no lleva `aria-current` y si `aria-haspopup`.
	 */
	showBranchSelector: boolean;
	selectedBranch: BranchInfo | null;
	isEmbeddedPreview: boolean;
	onOpenBranchModal: () => void;
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
	showBranchSelector,
	selectedBranch,
	isEmbeddedPreview,
	onOpenBranchModal,
	showAccountTab = false,
	onHome,
	onCart,
	onContact,
	onAccount,
}: MenuBottomNavProps) {
	const t = useTranslations("tenant.menu");
	const itemCount =
		1 +
		(onlineOrderingEnabled !== false ? 1 : 0) +
		(showContactTab ? 1 : 0) +
		(showBranchSelector ? 1 : 0) +
		(showAccountTab ? 1 : 0);
	const nombreSucursal = selectedBranch?.name || t("nav.selectBranch");
	/*
	 * En una columna de 81px cabian trece caracteres, y una sucursal real se
	 * llama "Pudahuel, Ciudad de los Valles": el recorte por ancho dejaba
	 * "Pudahuel, Ciu", que no dice mas que "Pudahuel" y encima parece roto.
	 * Cortar por la coma se queda con la parte que identifica el local; el nombre
	 * entero sigue en el `aria-label` y en el dialogo.
	 */
	const etiquetaSucursal = nombreSucursal.split(",")[0].trim() || nombreSucursal;

	return (
		<nav aria-label={t("nav.navAria")} className={`bottom-floating-navbar bottom-floating-navbar--count-${itemCount}`}>
			<button
				type="button"
				className={`bottom-nav-item ${activeTab === "home" ? "active-pill active-nav-circle" : ""}`}
				aria-current={activeTab === "home" ? "page" : undefined}
				onClick={onHome}
				aria-label={t("tabs.home")}
			>
				<span className="bottom-nav-tooltip" aria-hidden="true">{t("tabs.home")}</span>
				<span className="bottom-nav-icon-wrap" aria-hidden>
					<Home size={22} strokeWidth={2} />
				</span>
				<span className="bottom-nav-label">{t("tabs.home")}</span>
			</button>

			{onlineOrderingEnabled !== false && (
				<button
					type="button"
					className={`bottom-nav-item ${activeTab === "cart" ? "active-pill active-nav-circle" : ""}`}
					aria-current={activeTab === "cart" ? "page" : undefined}
					onClick={onCart}
					aria-label={totalItems > 0 ? t("tabs.cartWithCount", { count: totalItems }) : t("tabs.cart")}
				>
					<span className="bottom-nav-tooltip" aria-hidden="true">{t("tabs.cart")}</span>
					<span className="bottom-nav-icon-wrap" aria-hidden>
						<ShoppingBag size={22} strokeWidth={2} />
						{totalItems > 0 && (
							<span className="bottom-nav-cart-badge">{totalItems > 99 ? "99+" : totalItems}</span>
						)}
					</span>
					<span className="bottom-nav-label">{t("tabs.cart")}</span>
				</button>
			)}

			{showContactTab && (
				<button
					type="button"
					className={`bottom-nav-item ${activeTab === "contact" ? "active-pill active-nav-circle" : ""}`}
					aria-current={activeTab === "contact" ? "page" : undefined}
					onClick={onContact}
					aria-label={t("tabs.contact")}
				>
					<span className="bottom-nav-tooltip" aria-hidden="true">{t("tabs.contact")}</span>
					<span className="bottom-nav-icon-wrap" aria-hidden>
						<MessageCircle size={22} strokeWidth={2} />
					</span>
					<span className="bottom-nav-label">{t("tabs.contact")}</span>
				</button>
			)}
			{showBranchSelector && (
				<button
					type="button"
					className="bottom-nav-item bottom-nav-item--branch"
					onClick={onOpenBranchModal}
					disabled={isEmbeddedPreview}
					aria-disabled={isEmbeddedPreview}
					aria-haspopup="dialog"
					aria-label={t("nav.changeBranch", { name: nombreSucursal })}
				>
					<span className="bottom-nav-tooltip" aria-hidden="true">{etiquetaSucursal}</span>
					<span className="bottom-nav-icon-wrap" aria-hidden>
						<MapPin size={22} strokeWidth={2} />
					</span>
					{/* El `aria-label` de arriba lleva el nombre entero, asi que el lector
					    de pantalla no pierde nada aunque la etiqueta visible se acorte. */}
					<span className="bottom-nav-label">{etiquetaSucursal}</span>
				</button>
			)}

			{showAccountTab && (
				<button
					type="button"
					className={`bottom-nav-item ${activeTab === "account" ? "active-nav-circle" : ""}`}
					onClick={onAccount}
					aria-label={t("tabs.account")}
				>
					<span className="bottom-nav-icon-wrap" aria-hidden>
						<UserRound size={24} strokeWidth={2} />
					</span>
					<span className="bottom-nav-label">{t("tabs.account")}</span>
				</button>
			)}
		</nav>
	);
});
