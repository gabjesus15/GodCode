"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bike, Check, ChevronRight, Store } from "lucide-react";

import { formatCartMoney } from "../cart/utils/format-cart-money";

import type { MenuAccountOrder } from "./menu-account-types";

const ITEMS_PREVIEW = 2;

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

export function orderStatusKey(status: string): string {
	return KNOWN_ORDER_STATUSES.has(status) ? status : "other";
}

/** Paso del progreso en que va cada estado; los cerrados (entregado, retirado) completan los cuatro. */
const STATUS_STEP: Record<string, number> = {
	pending: 0,
	in_progress: 1,
	ready: 2,
	picked_up: 4,
	delivered: 4,
	completed: 4,
};

/** Cancelados, rechazados y estados desconocidos no tienen progreso que mostrar. */
export function orderHasTracker(status: string): boolean {
	return STATUS_STEP[status] !== undefined;
}

/**
 * Progreso del pedido: recibido → preparando → listo → entregado (o retirado). Sale
 * solo del estado que ya guarda el pedido; los cancelados y rechazados no lo llevan.
 */
export function OrderTracker({ order }: { order: MenuAccountOrder }) {
	const t = useTranslations("tenant.account.orders.track");
	const current = STATUS_STEP[order.status];
	if (current === undefined) return null;
	const steps = [
		t("received"),
		t("preparing"),
		t("ready"),
		t(order.fulfillment === "delivery" ? "delivered" : "pickedUp"),
	];
	return (
		<ol className="account-track">
			{steps.map((label, index) => {
				const state = index < current ? "done" : index === current ? "now" : "next";
				return (
					<li key={label} className={`account-track-step is-${state}`} aria-current={state === "now" ? "step" : undefined}>
						<span className="account-track-dot" aria-hidden>
							{state === "done" ? <Check size={14} strokeWidth={3} /> : null}
						</span>
						<span className="account-track-label">{label}</span>
					</li>
				);
			})}
		</ol>
	);
}

export function OrderStatusPill({ status }: { status: string }) {
	const t = useTranslations("tenant.account.orders");
	const key = orderStatusKey(status);
	return <span className={`account-order-status account-order-status--${key}`}>{t(`status.${key}`)}</span>;
}

export function useOrderDateFormatter() {
	const locale = useLocale();
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/** Fecha corta y tipo de entrega, con el ícono de la entrega. */
export function OrderMeta({ order }: { order: MenuAccountOrder }) {
	const t = useTranslations("tenant.account.orders");
	const dateFormatter = useOrderDateFormatter();
	const Icon = order.fulfillment === "delivery" ? Bike : Store;
	return (
		<span className="account-order-meta">
			<Icon size={14} aria-hidden />
			{dateFormatter.format(new Date(order.createdAt))} · {t(`fulfillment.${order.fulfillment}`)}
		</span>
	);
}

/** Tarjeta de un pedido en las listas: toda la tarjeta abre el detalle. */
export function OrderCard({ order, onOpen }: { order: MenuAccountOrder; onOpen: () => void }) {
	const t = useTranslations("tenant.account.orders");
	const extraItems = order.items.length - ITEMS_PREVIEW;
	return (
		<button
			type="button"
			className="account-order"
			onClick={onOpen}
			aria-label={t("detail.open", { number: order.number })}
		>
			<span className="account-order-top">
				<span className="account-order-main">
					<span className="account-order-number">{t("number", { number: order.number })}</span>
					<OrderMeta order={order} />
				</span>
				<OrderStatusPill status={order.status} />
			</span>
			{order.items.length > 0 ? (
				<span className="account-order-items">
					{order.items
						.slice(0, ITEMS_PREVIEW)
						.map((item) => `${item.quantity}× ${item.name}`)
						.join(", ")}
					{extraItems > 0 ? ` ${t("moreItems", { count: extraItems })}` : ""}
				</span>
			) : null}
			<span className="account-order-bottom">
				<span className="account-order-total">{formatCartMoney(order.total, order.currency)}</span>
				<span className="account-order-open">
					{t("viewDetail")}
					<ChevronRight size={16} aria-hidden />
				</span>
			</span>
		</button>
	);
}
