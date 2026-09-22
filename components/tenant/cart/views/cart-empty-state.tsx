"use client";

import { ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

/** Mismo icono que la pestaña de carrito de la barra inferior: pulsaste ahí, esto es lo que hay. */
export function CartEmptyState({ onMenu }: { onMenu: () => void }) {
	const t = useTranslations("tenant.cart.modal");
	return (
		<div className="cart-empty">
			<span className="cart-empty__icon" aria-hidden>
				<ShoppingBag size={28} strokeWidth={1.6} />
			</span>
			<h3 className="cart-empty__title">{t("empty.title")}</h3>
			<p className="cart-empty__hint">{t("empty.subtitle")}</p>
			<button type="button" className="cart-secondary-btn" onClick={onMenu}>
				{t("actions.backToMenu")}
			</button>
		</div>
	);
}
