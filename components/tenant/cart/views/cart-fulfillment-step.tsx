"use client";

import clsx from "clsx";
import { AlertCircle, ArrowLeft, Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DeliverySettingsNormalized } from "@/lib/delivery/delivery-settings";
import type { CountryFormStrategy } from "@/lib/geo/country-forms";
import type { CartFulfillment } from "../cart-context";
import type { DeliveryAddressController } from "../hooks/use-delivery-address";
import { useCart } from "../use-cart";
import type { DeliveryPricingMode, FulfillmentEvaluation } from "../utils/fulfillment-validation";
import { CartDeliveryFields } from "./cart-delivery-fields";
import { CartPickupCard } from "./cart-pickup-card";

export type CartFulfillmentBodyProps = {
	settings: DeliverySettingsNormalized;
	pricingMode: DeliveryPricingMode;
	address: DeliveryAddressController;
	strategy: CountryFormStrategy;
	evaluation: FulfillmentEvaluation;
	touched: boolean;
	onTouch: () => void;
	onFulfillmentChange: (next: CartFulfillment) => void;
	pickup: { branchName?: string | null; address?: string | null; schedule?: string | null };
};

/** Paso "cómo recibes tu pedido": elegir entre retiro y delivery, y resolver la entrega. */
export function CartFulfillmentBody({
	settings,
	pricingMode,
	address,
	strategy,
	evaluation,
	touched,
	onTouch,
	onFulfillmentChange,
	pickup,
}: CartFulfillmentBodyProps) {
	const t = useTranslations("tenant.cart.modal");
	const { fulfillment } = useCart();

	return (
		<section className="cart-step">
			<h3 className="cart-step__title">{t("delivery.howReceiveOrder")}</h3>
			{settings.enabled ? (
				<>
					<div className="cart-segmented" role="radiogroup" aria-label={t("delivery.howReceiveOrder")}>
						<button
							type="button"
							role="radio"
							aria-checked={fulfillment === "pickup"}
							className={clsx("cart-segmented__opt", fulfillment === "pickup" && "is-active")}
							onClick={() => onFulfillmentChange("pickup")}
						>
							<Store size={16} aria-hidden />
							<span>{t("delivery.pickup")}</span>
						</button>
						<button
							type="button"
							role="radio"
							aria-checked={fulfillment === "delivery"}
							className={clsx("cart-segmented__opt", fulfillment === "delivery" && "is-active")}
							onClick={() => onFulfillmentChange("delivery")}
						>
							<Truck size={16} aria-hidden />
							<span>{t("delivery.delivery")}</span>
						</button>
					</div>
					{fulfillment === "delivery" ? (
						<CartDeliveryFields
							settings={settings}
							pricingMode={pricingMode}
							address={address}
							strategy={strategy}
							evaluation={evaluation}
							touched={touched}
							onTouch={onTouch}
						/>
					) : (
						<CartPickupCard {...pickup} />
					)}
				</>
			) : (
				<>
					<p className="cart-hint">{t("delivery.pickupOnlyBranch")}</p>
					<CartPickupCard {...pickup} />
				</>
			)}
		</section>
	);
}

export function CartFulfillmentFoot({
	blockerMessage,
	showBlocker,
	onContinue,
	onBack,
}: {
	blockerMessage: string | null;
	showBlocker: boolean;
	onContinue: () => void;
	onBack: () => void;
}) {
	const t = useTranslations("tenant.cart.modal");
	return (
		<>
			{showBlocker && blockerMessage ? (
				<p className="cart-blocker" role="alert">
					<AlertCircle size={16} aria-hidden />
					<span>{blockerMessage}</span>
				</p>
			) : null}
			<button type="button" className="cart-cta" onClick={onContinue}>
				{t("actions.continueToPaymentMethods")}
			</button>
			<button type="button" className="cart-link-btn cart-link-btn--back" onClick={onBack}>
				<ArrowLeft size={15} aria-hidden />
				<span>{t("actions.backToSummary")}</span>
			</button>
		</>
	);
}
