"use client";

import { useTranslations } from "next-intl";

import type { DeliverySettingsNormalized } from "@/lib/delivery/delivery-settings";
import { useCart } from "../use-cart";
import { CartMoney } from "./cart-money";

/**
 * Desglose del pedido. El subtotal solo aparece cuando algo lo separa del
 * total (descuento, envío o impuesto): sin eso son el mismo número dos veces.
 */
export function CartTotals({ settings }: { settings: DeliverySettingsNormalized }) {
	const t = useTranslations("tenant.cart.modal");
	const {
		cartSubtotal,
		grandTotal,
		deliveryFee,
		taxTotal,
		fulfillment,
		appliedCouponDiscount,
		deliveryWaivedFree,
		isDeliveryOutOfZone,
		deliveryShowNumericFee,
		deliveryExternalHintText,
	} = useCart();

	const showsDelivery = fulfillment === "delivery" && settings.enabled;
	const hasDiscount = appliedCouponDiscount > 0;
	const hasTax = taxTotal > 0;
	const showSubtotal = hasDiscount || showsDelivery || hasTax;

	const deliveryValue = deliveryWaivedFree ? (
		<span className="cart-totals__value">{t("summary.free")}</span>
	) : isDeliveryOutOfZone ? (
		<span className="cart-totals__value">—</span>
	) : !deliveryShowNumericFee && deliveryExternalHintText ? (
		<span className="cart-totals__value cart-totals__value--hint">{deliveryExternalHintText}</span>
	) : (
		<CartMoney amount={deliveryFee} />
	);

	const taxLabel = [
		t("summary.tax"),
		settings.taxRate ? `${settings.taxRate}%` : "",
		settings.taxIncluded ? t("summary.taxIncluded") : t("summary.taxAdded"),
	]
		.filter(Boolean)
		.join(" · ");

	return (
		<dl className="cart-totals">
			{showSubtotal ? (
				<div className="cart-totals__row">
					<dt>{t("summary.subtotal")}</dt>
					<dd>
						<CartMoney amount={cartSubtotal} />
					</dd>
				</div>
			) : null}
			{hasDiscount ? (
				<div className="cart-totals__row cart-totals__row--discount">
					<dt>{t("summary.discount")}</dt>
					<dd>
						<CartMoney amount={appliedCouponDiscount} negative />
					</dd>
				</div>
			) : null}
			{showsDelivery ? (
				<div className="cart-totals__row">
					<dt>{t("summary.shipping")}</dt>
					<dd>{deliveryValue}</dd>
				</div>
			) : null}
			{hasTax ? (
				<div className="cart-totals__row">
					<dt>{taxLabel}</dt>
					<dd>
						<CartMoney amount={taxTotal} />
					</dd>
				</div>
			) : null}
			<div className="cart-totals__row cart-totals__row--grand">
				<dt>{t("summary.total")}</dt>
				<dd>
					{/* Remonta con cada valor nuevo: el total "respira" al cambiar. */}
					<span key={grandTotal} className="cart-refresh">
						<CartMoney amount={grandTotal} dual />
					</span>
				</dd>
			</div>
		</dl>
	);
}
