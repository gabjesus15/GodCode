"use client";

import { UserRound } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * "¿Estás afiliado?": se le pregunta a quien va a pagar sin sesión en "Mi cuenta",
 * porque un pedido de invitado no suma puntos. Va antes de elegir entrega: si entra a
 * su cuenta, todavía no escribió nada que perder.
 */
export function CartAffiliationBody({ businessName }: { businessName?: string | null }) {
	const t = useTranslations("tenant.cart.modal");
	return (
		<section className="cart-step cart-store-pay">
			<span className="cart-store-pay__icon" aria-hidden>
				<UserRound size={24} />
			</span>
			<h3 className="cart-step__title">{t("affiliation.title")}</h3>
			<p className="cart-hint">
				{businessName?.trim()
					? t("affiliation.body", { business: businessName.trim() })
					: t("affiliation.bodyGeneric")}
			</p>
		</section>
	);
}

export type CartAffiliationFootProps = {
	onSignIn: () => void;
	onContinueAsGuest: () => void;
	onRegister: () => void;
};

export function CartAffiliationFoot({ onSignIn, onContinueAsGuest, onRegister }: CartAffiliationFootProps) {
	const t = useTranslations("tenant.cart.modal");
	return (
		<>
			<button type="button" className="cart-cta" onClick={onSignIn}>
				{t("affiliation.yes")}
			</button>
			<button type="button" className="cart-secondary-btn cart-affiliation__guest" onClick={onContinueAsGuest}>
				{t("affiliation.no")}
			</button>
			<button type="button" className="cart-link-btn cart-affiliation__register" onClick={onRegister}>
				{t("affiliation.register")}
			</button>
		</>
	);
}
