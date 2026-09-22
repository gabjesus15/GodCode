"use client";

import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";

import type { BusinessInfo, LastOrderSuccess } from "../cart-modal-types";

function copyText(text: string): void {
	if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
		navigator.clipboard.writeText(text).catch(() => {});
	}
}

export function CartSuccessView({
	onNewOrder,
	onGoHome,
	receiptUploadFailed,
	activeInfo,
	lastOrder,
}: {
	onNewOrder: () => void;
	onGoHome: () => void;
	receiptUploadFailed: boolean;
	activeInfo: BusinessInfo;
	lastOrder: LastOrderSuccess | null;
}) {
	const t = useTranslations("tenant.cart.modal");
	const showDeliveryCodes = lastOrder?.fulfillment === "delivery" && Boolean(lastOrder?.handoff_code);
	const orderLabel =
		lastOrder?.order_number != null
			? `#${lastOrder.order_number}`
			: lastOrder && lastOrder.id > 0
				? `#${lastOrder.id}`
				: null;

	return (
		<div className="cart-success">
			<span className="cart-success__icon" aria-hidden>
				<Check size={32} strokeWidth={2.5} />
			</span>
			<h3 className="cart-success__title">{t("success.title")}</h3>
			<p className="cart-success__text">{t("success.description")}</p>

			{receiptUploadFailed ? (
				<p className="cart-warn">{t("success.receiptUploadFailed")}</p>
			) : lastOrder?.paymentStatus === "paid" ? (
				<p className="cart-hint">{t("success.paymentConfirmed")}</p>
			) : lastOrder?.paymentStatus === "pending_verification" ? (
				<p className="cart-warn">{t("success.paymentPendingVerification")}</p>
			) : null}

			{showDeliveryCodes ? (
				<>
					<p className="cart-success__keep">
						<strong>{t("success.keepCodesTitle")}</strong> {t("success.keepCodesBody")}
					</p>
					<dl className="cart-success__card">
						{orderLabel ? (
							<div className="cart-success__row">
								<dt>{t("success.yourOrder")}</dt>
								<dd>
									<button
										type="button"
										className="cart-success__copy"
										onClick={() => copyText(orderLabel.replace("#", ""))}
										aria-label={t("success.copyOrderNumber")}
									>
										<b>{orderLabel}</b>
										<Copy size={14} aria-hidden />
									</button>
								</dd>
							</div>
						) : null}
						<div className="cart-success__row">
							<dt>{t("success.deliveryCode")}</dt>
							<dd>
								<button
									type="button"
									className="cart-success__copy cart-success__copy--code"
									onClick={() => copyText(lastOrder?.handoff_code ?? "")}
									aria-label={t("success.copyDeliveryCode")}
								>
									<b>{lastOrder?.handoff_code}</b>
									<Copy size={14} aria-hidden />
								</button>
							</dd>
						</div>
					</dl>
				</>
			) : (
				<dl className="cart-success__card">
					<div className="cart-success__row">
						<dt>{t("success.pickupAt")}</dt>
						<dd>
							<b>{activeInfo?.address || t("success.addressUnavailable")}</b>
							<span className="cart-success__sub">{activeInfo?.name || t("success.storeNameFallback")}</span>
						</dd>
					</div>
					{orderLabel ? (
						<div className="cart-success__row">
							<dt>{t("success.orderNumber")}</dt>
							<dd>
								<b>{orderLabel}</b>
							</dd>
						</div>
					) : null}
				</dl>
			)}

			<div className="cart-success__actions">
				<button type="button" className="cart-cta" onClick={onNewOrder}>
					{t("actions.newOrder")}
				</button>
				<button type="button" className="cart-secondary-btn" onClick={onGoHome}>
					{t("actions.backToMenu")}
				</button>
			</div>
		</div>
	);
}
