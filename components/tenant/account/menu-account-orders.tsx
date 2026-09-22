"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, UtensilsCrossed } from "lucide-react";

import { formatCartMoney } from "../cart/utils/format-cart-money";

import type { MenuAccountOrder } from "./menu-account-types";
import { errorMessage } from "./menu-account-auth-panel";
import { MenuAccountOrderDetail, orderStatusKey } from "./menu-account-order-detail";
import { useMenuAccount } from "./use-menu-account";
import { useRepeatOrder } from "./use-repeat-order";

const ITEMS_PREVIEW = 3;

type MenuAccountOrdersProps = {
	companySlug: string;
	/** Avisa al dashboard para ocultar su encabezado mientras se ve un detalle. */
	onDetailChange?: (open: boolean) => void;
};

export function MenuAccountOrders({ companySlug, onDetailChange }: MenuAccountOrdersProps) {
	const t = useTranslations("tenant.account.orders");
	const tAccount = useTranslations("tenant.account");
	const locale = useLocale();
	const { pending, errorCode, run } = useMenuAccount("login");
	const [orders, setOrders] = useState<MenuAccountOrder[] | null>(null);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const { menuPath } = useRepeatOrder();

	useEffect(() => {
		let cancelled = false;
		void run<{ orders: MenuAccountOrder[] }>(
			`orders?companySlug=${encodeURIComponent(companySlug)}`,
			{ method: "GET" },
		).then((result) => {
			if (!cancelled && result.ok) setOrders(result.data.orders);
		});
		return () => {
			cancelled = true;
		};
	}, [companySlug, run]);

	/* El detalle es una "pantalla" dentro de la sección: entra con un estado en el
	   historial para que el gesto de volver del teléfono (o el botón atrás) lo
	   cierre en vez de sacar a la persona de su cuenta. */
	const openDetail = (id: string | null) => {
		setSelectedId(id);
		onDetailChange?.(id !== null);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};
	const showDetail = (id: string) => {
		window.history.pushState({ accountOrder: id }, "");
		openDetail(id);
	};
	const closeDetail = () => {
		if (window.history.state?.accountOrder) window.history.back();
		else openDetail(null);
	};
	useEffect(() => {
		const onPopState = () => {
			if (!window.history.state?.accountOrder) openDetail(null);
		};
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
		// openDetail solo toca estado propio; no hace falta rehacer el listener.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const selected = selectedId ? orders?.find((order) => order.id === selectedId) : null;
	if (selected) {
		return <MenuAccountOrderDetail order={selected} onBack={closeDetail} />;
	}

	const dateFormatter = new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<div className="account-panel">
			{errorCode ? <p className="account-error">{errorMessage(tAccount, errorCode)}</p> : null}

			{orders === null && pending ? <p className="account-note">{t("loading")}</p> : null}

			{orders !== null && orders.length === 0 ? (
				<p className="account-empty">{t("empty")}</p>
			) : null}

			{orders && orders.length > 0 ? (
				<ul className="account-list">
					{orders.map((order) => {
						const status = orderStatusKey(order.status);
						const extraItems = order.items.length - ITEMS_PREVIEW;
						return (
							<li key={order.id}>
								<button
									type="button"
									className="account-order"
									onClick={() => showDetail(order.id)}
									aria-label={t("detail.open", { number: order.number })}
								>
									<div className="account-order-main">
										<span className="account-order-number">
											{t("number", { number: order.number })}
										</span>
										<span className="account-order-meta">
											{dateFormatter.format(new Date(order.createdAt))} ·{" "}
											{t(`fulfillment.${order.fulfillment}`)}
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
									</div>
									<div className="account-order-side">
										<span className={`account-order-status account-order-status--${status}`}>
											{t(`status.${status}`)}
										</span>
										<span className="account-order-total">
											{formatCartMoney(order.total, order.currency)}
										</span>
									</div>
									<ChevronRight size={16} className="account-order-chevron" aria-hidden />
								</button>
							</li>
						);
					})}
				</ul>
			) : null}

			{orders !== null ? (
				<div className="account-actions">
					<Link href={menuPath()} className="account-button">
						<UtensilsCrossed size={15} aria-hidden />
						{t(orders.length === 0 ? "orderNow" : "goToMenu")}
					</Link>
				</div>
			) : null}
		</div>
	);
}
