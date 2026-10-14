"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UtensilsCrossed } from "lucide-react";

import type { MenuAccountOrder } from "./menu-account-types";
import { errorMessage } from "./menu-account-auth-panel";
import { MenuAccountOrderDetail } from "./menu-account-order-detail";
import { OrderCard } from "./menu-account-order-parts";
import { isActiveOrder } from "./use-account-orders";
import { useRepeatOrder } from "./use-repeat-order";

type OrdersFilter = "all" | "active" | "past";

type MenuAccountOrdersProps = {
	/** Lista compartida con el inicio (`useAccountOrders`); null mientras carga. */
	orders: MenuAccountOrder[] | null;
	loading: boolean;
	errorCode: string | null;
	/** Pedido que se abre al entrar, cuando se tocó desde el inicio. */
	initialOrderId?: string | null;
	/** Avisa al dashboard para ocultar su encabezado mientras se ve un detalle. */
	onDetailChange?: (open: boolean) => void;
};

export function MenuAccountOrders({
	orders,
	loading,
	errorCode,
	initialOrderId = null,
	onDetailChange,
}: MenuAccountOrdersProps) {
	const t = useTranslations("tenant.account.orders");
	const tAccount = useTranslations("tenant.account");
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [filter, setFilter] = useState<OrdersFilter>("all");
	const { menuPath } = useRepeatOrder();

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
	useEffect(() => {
		if (initialOrderId) showDetail(initialOrderId);
		// Solo al montar: el pedido elegido en el inicio se abre una vez.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const selected = selectedId ? orders?.find((order) => order.id === selectedId) : null;
	if (selected) {
		return <MenuAccountOrderDetail order={selected} onBack={closeDetail} />;
	}

	const activeCount = orders?.filter(isActiveOrder).length ?? 0;
	const shown =
		orders?.filter((order) =>
			filter === "all" ? true : filter === "active" ? isActiveOrder(order) : !isActiveOrder(order),
		) ?? [];

	return (
		<div className="account-panel">
			{errorCode ? <p className="account-error">{errorMessage(tAccount, errorCode)}</p> : null}

			{loading ? <p className="account-note">{t("loading")}</p> : null}

			{orders !== null && orders.length === 0 ? (
				<div className="account-empty">
					<p>{t("empty")}</p>
					<Link href={menuPath()} className="account-button account-button--primary">
						<UtensilsCrossed size={16} aria-hidden />
						{t("orderNow")}
					</Link>
				</div>
			) : null}

			{orders && orders.length > 0 ? (
				<>
					{/* Filtros solo cuando hay algo en curso: si todo es historial, sobran. */}
					{activeCount > 0 ? (
						<div className="account-chips" role="group" aria-label={t("filters.label")}>
							{(
								[
									["all", orders.length],
									["active", activeCount],
									["past", orders.length - activeCount],
								] as const
							).map(([id, count]) => (
								<button
									key={id}
									type="button"
									className={`account-chip ${filter === id ? "is-active" : ""}`}
									aria-pressed={filter === id}
									onClick={() => setFilter(id)}
								>
									{t(`filters.${id}`)} · {count}
								</button>
							))}
						</div>
					) : null}
					<ul className="account-order-list">
						{shown.map((order) => (
							<li key={order.id}>
								<OrderCard order={order} onOpen={() => showDetail(order.id)} />
							</li>
						))}
					</ul>
				</>
			) : null}

			{orders && orders.length > 0 ? (
				<div className="account-actions">
					<Link href={menuPath()} className="account-button account-button--ghost">
						<UtensilsCrossed size={16} aria-hidden />
						{t("goToMenu")}
					</Link>
				</div>
			) : null}
		</div>
	);
}
