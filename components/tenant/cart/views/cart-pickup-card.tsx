"use client";

import { ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

export type CartPickupCardProps = {
	branchName?: string | null;
	address?: string | null;
	schedule?: string | null;
};

/**
 * Retiro en el local: dónde, cuándo y cómo llegar, como líneas de un recibo.
 * Antes este paso era una pantalla vacía con un aviso.
 */
export function CartPickupCard({ branchName, address, schedule }: CartPickupCardProps) {
	const t = useTranslations("tenant.cart.modal");
	const locale = useLocale();
	const where = address?.trim() ?? "";
	const when = schedule?.trim() ?? "";
	const localeCode = locale.toLowerCase().split("-")[0] || "en";
	const mapsHref = where
		? `https://www.google.com/maps?q=${encodeURIComponent([branchName, where].filter(Boolean).join(" "))}&hl=${encodeURIComponent(localeCode)}`
		: null;

	return (
		<div className="cart-pickup">
			<p className="cart-pickup__title">{t("delivery.pickupTitle")}</p>
			<div className="cart-pickup__head">
				{branchName ? <p className="cart-pickup__name">{branchName}</p> : null}
				{mapsHref ? (
					<a className="cart-pickup__link" href={mapsHref} target="_blank" rel="noopener noreferrer">
						<span>{t("delivery.pickupOpenMap")}</span>
						<ExternalLink size={14} aria-hidden />
					</a>
				) : null}
			</div>
			<p className={where ? "cart-pickup__row" : "cart-pickup__row cart-pickup__row--muted"}>
				{where || t("delivery.pickupNoAddress")}
			</p>
			{when ? <p className="cart-pickup__row">{when}</p> : null}
		</div>
	);
}
