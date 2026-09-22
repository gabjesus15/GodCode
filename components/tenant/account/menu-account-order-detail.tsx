"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, RotateCcw, UtensilsCrossed } from "lucide-react";

import { formatCartMoney } from "../cart/utils/format-cart-money";

import type { MenuAccountOrder } from "./menu-account-types";
import { repeatableItems, useRepeatOrder } from "./use-repeat-order";

/** Estados con etiqueta propia; cualquier otro cae en `status.other`. */
export const KNOWN_ORDER_STATUSES = new Set([
	"pending",
	"in_progress",
	"ready",
	"picked_up",
	"delivered",
	"completed",
	"cancelled",
	"rejected",
]);

const KNOWN_PAYMENT_STATUSES = new Set(["paid", "pending", "partial"]);

export function orderStatusKey(status: string): string {
	return KNOWN_ORDER_STATUSES.has(status) ? status : "other";
}

type MenuAccountOrderDetailProps = {
	order: MenuAccountOrder;
	onBack: () => void;
};

export function MenuAccountOrderDetail({ order, onBack }: MenuAccountOrderDetailProps) {
	const t = useTranslations("tenant.account.orders");
	const tPayment = useTranslations("tenant.cart.modal.paymentMethods");
	const locale = useLocale();

	const money = (amount: number) => formatCartMoney(amount, order.currency);
	const status = orderStatusKey(order.status);
	const paymentStatus = order.paymentStatus
		? KNOWN_PAYMENT_STATUSES.has(order.paymentStatus)
			? order.paymentStatus
			: "other"
		: null;
	const paymentMethod =
		order.paymentMethod && tPayment.has(order.paymentMethod)
			? tPayment(order.paymentMethod)
			: order.paymentMethod;
	const createdAt = new Intl.DateTimeFormat(locale, {
		dateStyle: "long",
		timeStyle: "short",
	}).format(new Date(order.createdAt));
	const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
	const { repeatOrder, menuPath } = useRepeatOrder();
	const canRepeat = repeatableItems(order).length > 0;

	return (
		<div className="account-panel">
			<div className="account-detail-head">
				<button type="button" className="account-back-link" onClick={onBack}>
					<ChevronLeft size={16} aria-hidden />
					{t("detail.back")}
				</button>
				<div className="account-detail-title-row">
					<h3 className="account-detail-title">{t("number", { number: order.number })}</h3>
					<span className={`account-order-status account-order-status--${status}`}>
						{t(`status.${status}`)}
					</span>
				</div>
				<span className="account-section-description">{createdAt}</span>
				<OrderActions
					menuHref={menuPath(order.branchId)}
					canRepeat={canRepeat}
					onRepeat={() => void repeatOrder(order)}
				/>
			</div>

			<section className="account-group">
				<h4 className="account-group-title">{t("detail.payment")}</h4>
				<div className="account-rows">
					<div className="account-row">
						<span className="account-row-label">{t("detail.paymentMethod")}</span>
						<span className="account-row-value">{paymentMethod ?? t("detail.notAvailable")}</span>
					</div>
					{paymentStatus ? (
						<div className="account-row">
							<span className="account-row-label">{t("detail.paymentStatus")}</span>
							<span>
								<span
									className={`account-payment-status account-payment-status--${paymentStatus}`}
								>
									{t(`paymentStatus.${paymentStatus}`)}
								</span>
							</span>
						</div>
					) : null}
				</div>
			</section>

			<section className="account-group">
				<h4 className="account-group-title">{t("detail.fulfillment")}</h4>
				<div className="account-rows">
					<div className="account-row">
						<span className="account-row-label">{t("detail.type")}</span>
						<span className="account-row-value">{t(`fulfillment.${order.fulfillment}`)}</span>
					</div>
					{order.delivery ? (
						<>
							<div className="account-row">
								<span className="account-row-label">{t("detail.address")}</span>
								<span className="account-row-text">
									{order.delivery.address || t("detail.notAvailable")}
								</span>
							</div>
							{order.delivery.reference ? (
								<div className="account-row">
									<span className="account-row-label">{t("detail.reference")}</span>
									<span className="account-row-text">{order.delivery.reference}</span>
								</div>
							) : null}
							{order.handoffCode ? (
								<div className="account-row">
									<span className="account-row-label">{t("detail.handoffCode")}</span>
									<span className="account-handoff-code">{order.handoffCode}</span>
								</div>
							) : null}
						</>
					) : null}
					{order.branch ? (
						<div className="account-row">
							<span className="account-row-label">{t("detail.branch")}</span>
							<span className="account-row-text">
								{order.branch.name}
								{order.branch.address ? (
									<span className="account-row-subtext">{order.branch.address}</span>
								) : null}
							</span>
						</div>
					) : null}
				</div>
			</section>

			<section className="account-group">
				<h4 className="account-group-title">{t("detail.products", { count: itemCount })}</h4>
				<ul className="account-list account-list--flush">
					{order.items.map((item, index) => (
						<li key={`${item.name}-${index}`} className="account-line">
							<span className="account-line-qty">{item.quantity}×</span>
							<div className="account-line-main">
								<span className="account-line-name">{item.name}</span>
								{item.extras.map((extra, extraIndex) => (
									<span key={`${extra.name}-${extraIndex}`} className="account-line-extra">
										+ {extra.quantity > 1 ? `${extra.quantity}× ` : ""}
										{extra.name}
										{extra.price > 0 ? ` (${money(extra.price)})` : ""}
									</span>
								))}
								{item.note ? (
									<span className="account-line-note">
										{t("detail.itemNote", { note: item.note })}
									</span>
								) : null}
							</div>
							<span className="account-line-total">{money(item.lineTotal)}</span>
						</li>
					))}
				</ul>
			</section>

			{order.note ? (
				<section className="account-group">
					<h4 className="account-group-title">{t("detail.note")}</h4>
					<p className="account-detail-note">{order.note}</p>
				</section>
			) : null}

			<section className="account-group">
				<h4 className="account-group-title">{t("detail.summary")}</h4>
				<div className="account-rows">
					<div className="account-row account-row--compact">
						<span className="account-row-label">{t("detail.subtotal")}</span>
						<span className="account-row-amount">{money(order.subtotal)}</span>
					</div>
					{order.discountTotal > 0 ? (
						<div className="account-row account-row--compact">
							<span className="account-row-label">{t("detail.discount")}</span>
							<span className="account-row-amount account-row-amount--discount">
								−{money(order.discountTotal)}
							</span>
						</div>
					) : null}
					{order.fulfillment === "delivery" ? (
						<div className="account-row account-row--compact">
							<span className="account-row-label">{t("detail.deliveryFee")}</span>
							<span className="account-row-amount">
								{order.deliveryFee > 0 ? money(order.deliveryFee) : t("detail.free")}
							</span>
						</div>
					) : null}
					<div className="account-row account-row--total">
						<span className="account-row-label">{t("detail.total")}</span>
						<span className="account-row-amount">{money(order.total)}</span>
					</div>
				</div>
			</section>
		</div>
	);
}

type OrderActionsProps = {
	menuHref: string;
	canRepeat: boolean;
	onRepeat: () => void;
};

function OrderActions({ menuHref, canRepeat, onRepeat }: OrderActionsProps) {
	const t = useTranslations("tenant.account.orders");
	return (
		<div className="account-order-actions">
			<button
				type="button"
				className="account-button"
				onClick={onRepeat}
				disabled={!canRepeat}
				title={canRepeat ? undefined : t("repeatUnavailable")}
			>
				<RotateCcw size={15} aria-hidden />
				{t("repeat")}
			</button>
			<Link href={menuHref} className="account-button account-button--ghost">
				<UtensilsCrossed size={15} aria-hidden />
				{t("goToMenu")}
			</Link>
			<p className="account-note account-order-actions-hint">{t("repeatHint")}</p>
		</div>
	);
}
