"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bike, ChevronLeft, CreditCard, MapPin, RotateCcw, Store, UtensilsCrossed } from "lucide-react";

import { formatCartMoney } from "../cart/utils/format-cart-money";

import { AccountBusyLabel } from "./account-fields";
import type { MenuAccountOrder } from "./menu-account-types";
import { OrderStatusPill, OrderTracker, orderHasTracker } from "./menu-account-order-parts";
import { repeatableItems, useRepeatOrder } from "./use-repeat-order";

const KNOWN_PAYMENT_STATUSES = new Set(["paid", "pending", "partial"]);

type MenuAccountOrderDetailProps = {
	order: MenuAccountOrder;
	onBack: () => void;
};

/** Fila con ícono: título pequeño arriba y el dato debajo. */
function DetailItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
	return (
		<div className="account-kv">
			<span className="account-kv-icon" aria-hidden>
				{icon}
			</span>
			<div className="account-kv-body">
				<span className="account-kv-label">{label}</span>
				{children}
			</div>
		</div>
	);
}

export function MenuAccountOrderDetail({ order, onBack }: MenuAccountOrderDetailProps) {
	const t = useTranslations("tenant.account.orders");
	const tPayment = useTranslations("tenant.cart.modal.paymentMethods");
	const locale = useLocale();

	const money = (amount: number) => formatCartMoney(amount, order.currency);
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
	/* Deshabilitado hasta que navegue: repetir reescribe el carrito y empuja la
	   ruta, y un segundo toque duplicaría ese trabajo. */
	const [repeating, setRepeating] = useState(false);
	const handleRepeat = () => {
		if (repeating) return;
		setRepeating(true);
		void repeatOrder(order).then((ok) => {
			if (!ok) setRepeating(false);
		});
	};

	return (
		<div className="account-panel account-detail">
			<div className="account-detail-head">
				<button type="button" className="account-back-link" onClick={onBack}>
					<ChevronLeft size={16} aria-hidden />
					{t("detail.back")}
				</button>
				<div className="account-detail-title-row">
					<h3 className="account-detail-title">{t("number", { number: order.number })}</h3>
					<OrderStatusPill status={order.status} />
				</div>
				<span className="account-section-description">{createdAt}</span>
			</div>

			<div className="account-detail-grid">
				<div className="account-detail-col">
					{orderHasTracker(order.status) ? (
						<div className="account-card-block">
							<OrderTracker order={order} />
						</div>
					) : null}

					{order.delivery && order.handoffCode ? (
						<div className="account-handoff">
							<div>
								<span className="account-handoff-title">{t("detail.handoffCode")}</span>
								<span className="account-handoff-hint">{t("detail.handoffHint")}</span>
							</div>
							<span className="account-handoff-code">{order.handoffCode}</span>
						</div>
					) : null}

					<section className="account-card-block">
						<h4 className="account-block-title">{t("detail.fulfillment")}</h4>
						<DetailItem
							icon={order.fulfillment === "delivery" ? <Bike size={18} /> : <Store size={18} />}
							label={t("detail.type")}
						>
							<span className="account-kv-value">{t(`fulfillment.${order.fulfillment}`)}</span>
						</DetailItem>
						{order.delivery ? (
							<DetailItem icon={<MapPin size={18} />} label={t("detail.address")}>
								<span className="account-kv-value">{order.delivery.address || t("detail.notAvailable")}</span>
								{order.delivery.reference ? (
									<span className="account-kv-sub">
										{t("detail.reference")}: {order.delivery.reference}
									</span>
								) : null}
							</DetailItem>
						) : null}
						{order.branch ? (
							<DetailItem icon={<Store size={18} />} label={t("detail.branch")}>
								<span className="account-kv-value">{order.branch.name}</span>
								{order.branch.address ? <span className="account-kv-sub">{order.branch.address}</span> : null}
							</DetailItem>
						) : null}
					</section>

					<section className="account-card-block">
						<h4 className="account-block-title">{t("detail.payment")}</h4>
						<DetailItem icon={<CreditCard size={18} />} label={t("detail.paymentMethod")}>
							<span className="account-kv-value account-kv-value--inline">
								{paymentMethod ?? t("detail.notAvailable")}
								{paymentStatus ? (
									<span className={`account-payment-status account-payment-status--${paymentStatus}`}>
										{t(`paymentStatus.${paymentStatus}`)}
									</span>
								) : null}
							</span>
						</DetailItem>
					</section>
				</div>

				<div className="account-detail-col">
					<section className="account-card-block">
						<h4 className="account-block-title">{t("detail.products", { count: itemCount })}</h4>
						<ul className="account-lines">
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
											<span className="account-line-note">{t("detail.itemNote", { note: item.note })}</span>
										) : null}
									</div>
									<span className="account-line-total">{money(item.lineTotal)}</span>
								</li>
							))}
						</ul>

						{order.note ? (
							<div className="account-detail-note">
								<span className="account-kv-label">{t("detail.note")}</span>
								<p>{order.note}</p>
							</div>
						) : null}

						<dl className="account-summary">
							<div>
								<dt>{t("detail.subtotal")}</dt>
								<dd>{money(order.subtotal)}</dd>
							</div>
							{order.discountTotal > 0 ? (
								<div className="account-summary-discount">
									<dt>{t("detail.discount")}</dt>
									<dd>−{money(order.discountTotal)}</dd>
								</div>
							) : null}
							{order.fulfillment === "delivery" ? (
								<div>
									<dt>{t("detail.deliveryFee")}</dt>
									<dd>{order.deliveryFee > 0 ? money(order.deliveryFee) : t("detail.free")}</dd>
								</div>
							) : null}
							<div className="account-summary-total">
								<dt>{t("detail.total")}</dt>
								<dd>{money(order.total)}</dd>
							</div>
						</dl>
					</section>

					<OrderActions
						menuHref={menuPath(order.branchId)}
						canRepeat={canRepeat}
						repeating={repeating}
						onRepeat={handleRepeat}
					/>
				</div>
			</div>
		</div>
	);
}

type OrderActionsProps = {
	menuHref: string;
	canRepeat: boolean;
	repeating: boolean;
	onRepeat: () => void;
};

function OrderActions({ menuHref, canRepeat, repeating, onRepeat }: OrderActionsProps) {
	const t = useTranslations("tenant.account.orders");
	return (
		<div className="account-order-actions">
			<div className="account-order-actions-row">
				<button
					type="button"
					className="account-button account-button--primary"
					onClick={onRepeat}
					disabled={!canRepeat || repeating}
					title={canRepeat ? undefined : t("repeatUnavailable")}
				>
					{repeating ? null : <RotateCcw size={16} aria-hidden />}
					<AccountBusyLabel busy={repeating} idle={t("repeat")} working={t("repeating")} />
				</button>
				<Link href={menuHref} className="account-button account-button--ghost">
					<UtensilsCrossed size={16} aria-hidden />
					{t("goToMenu")}
				</Link>
			</div>
			<p className="account-note account-order-actions-hint">{t("repeatHint")}</p>
		</div>
	);
}
