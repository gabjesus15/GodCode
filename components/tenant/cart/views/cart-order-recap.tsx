"use client";

import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { CartMoney } from "./cart-money";

export type CartRecapDetail = {
	key: string;
	label: string;
	value: string;
	onEdit?: () => void;
};

export type CartOrderRecapProps = {
	units: number;
	total: number;
	onEditItems: () => void;
	/** Entrega y método de pago: solo se muestran donde el cliente confirma a ciegas. */
	details?: CartRecapDetail[];
};

/**
 * Lo que el cliente ya decidió, en filas iguales: etiqueta, valor y un chevron.
 * Cada fila es un botón que vuelve al paso donde se decidió; no hay verbos en
 * color compitiendo entre sí, la jerarquía la ponen los valores.
 */
export function CartOrderRecap({ units, total, onEditItems, details = [] }: CartOrderRecapProps) {
	const t = useTranslations("tenant.cart.modal");
	return (
		<div className="cart-recap" role="group" aria-label={t("fulfillment.recapAria")}>
			<button
				type="button"
				className="cart-recap__row"
				onClick={onEditItems}
				aria-label={`${t("header.itemCount", { count: units })} — ${t("fulfillment.editItems")}`}
			>
				<span className="cart-recap__label">{t("fulfillment.orderRecapLabel")}</span>
				<span className="cart-recap__value">{t("header.itemCount", { count: units })}</span>
				<CartMoney amount={total} dual className="cart-recap__amount" />
				<ChevronRight size={16} className="cart-recap__chevron" aria-hidden />
			</button>

			{details.map((detail) =>
				detail.onEdit ? (
					<button
						key={detail.key}
						type="button"
						className="cart-recap__row"
						onClick={detail.onEdit}
						aria-label={`${detail.label}: ${detail.value} — ${t("fulfillment.change")}`}
					>
						<span className="cart-recap__label">{detail.label}</span>
						<span className="cart-recap__value">{detail.value}</span>
						<ChevronRight size={16} className="cart-recap__chevron" aria-hidden />
					</button>
				) : (
					<div key={detail.key} className="cart-recap__row">
						<span className="cart-recap__label">{detail.label}</span>
						<span className="cart-recap__value">{detail.value}</span>
					</div>
				),
			)}
		</div>
	);
}
