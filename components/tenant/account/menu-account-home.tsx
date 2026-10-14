"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, MapPin, RotateCcw, Star, UserRound, UtensilsCrossed } from "lucide-react";

import type { LoyaltyEarnRule } from "@/lib/loyalty/earn-rules-shared";

import { useDescribeEarnRule, visibleEarnRules } from "./account-earn-rules";
import { AccountBusyLabel } from "./account-fields";
import type { MenuAccountOrder } from "./menu-account-types";
import { errorMessage } from "./menu-account-auth-panel";
import { OrderCard, OrderMeta, OrderStatusPill, OrderTracker } from "./menu-account-order-parts";
import { isActiveOrder } from "./use-account-orders";
import { repeatableItems, useRepeatOrder } from "./use-repeat-order";

const RECENT_LIMIT = 2;

type HomeSection = "orders" | "rewards" | "addresses" | "settings";

type MenuAccountHomeProps = {
	/** Puntos en este negocio; null mientras carga o si falló (no se muestra la tarjeta). */
	points: number | null;
	/** Reglas activas para ganar puntos (las arma el CEO en /cuenta › Mi menú). */
	earnRules: LoyaltyEarnRule[];
	orders: MenuAccountOrder[] | null;
	loading: boolean;
	errorCode: string | null;
	onOpenOrder: (id: string) => void;
	onGo: (section: HomeSection) => void;
};

/** Acceso rápido: ícono con el color del local, título y una línea de apoyo. */
function QuickAction({
	icon,
	title,
	sub,
	...rest
}: { icon: ReactNode; title: ReactNode; sub: string } & (
	| { href: string; onClick?: never; disabled?: never }
	| { href?: never; onClick: () => void; disabled?: boolean }
)) {
	const body = (
		<>
			<span className="account-quick-icon" aria-hidden>
				{icon}
			</span>
			<span className="account-quick-text">
				<span className="account-quick-title">{title}</span>
				<span className="account-quick-sub">{sub}</span>
			</span>
		</>
	);
	if (rest.href) {
		return (
			<Link href={rest.href} className="account-quick">
				{body}
			</Link>
		);
	}
	return (
		<button type="button" className="account-quick" onClick={rest.onClick} disabled={rest.disabled}>
			{body}
		</button>
	);
}

/**
 * Inicio de la cuenta: el pedido en curso con su progreso, accesos rápidos y los
 * últimos pedidos.
 */
export function MenuAccountHome({ points, earnRules, orders, loading, errorCode, onOpenOrder, onGo }: MenuAccountHomeProps) {
	const t = useTranslations("tenant.account.home");
	const locale = useLocale();
	const formatNumber = (value: number) => new Intl.NumberFormat(locale).format(value);
	const tOrders = useTranslations("tenant.account.orders");
	const describeRule = useDescribeEarnRule();
	const shownRules = visibleEarnRules(earnRules);
	const tAccount = useTranslations("tenant.account");
	const { repeatOrder, menuPath } = useRepeatOrder();
	const [repeating, setRepeating] = useState(false);

	const live = orders?.find(isActiveOrder) ?? null;
	const lastRepeatable = orders?.find((order) => repeatableItems(order).length > 0) ?? null;
	const recent = (orders ?? []).filter((order) => order.id !== live?.id).slice(0, RECENT_LIMIT);

	const handleRepeat = () => {
		if (!lastRepeatable || repeating) return;
		setRepeating(true);
		void repeatOrder(lastRepeatable).then((ok) => {
			if (!ok) setRepeating(false);
		});
	};

	return (
		<div className="account-panel account-home">
			{points !== null ? (
				<button
					type="button"
					className="account-card-block account-points account-points--link"
					onClick={() => onGo("rewards")}
				>
					<span className="account-points-icon" aria-hidden>
						<Star size={22} fill="currentColor" />
					</span>
					<span className="account-points-body">
						<span className="account-points-title">{t("points.title")}</span>
						<span className="account-points-value">
							<strong>{formatNumber(points)}</strong> {t("points.unit", { count: points })}
						</span>
						{shownRules.length > 0 ? (
							<span className="account-points-rule">
								{describeRule(shownRules[0])}
								{shownRules.length > 1 ? ` ${t("points.more", { count: shownRules.length - 1 })}` : ""}
							</span>
						) : null}
					</span>
					<span className="account-points-cta">
						{t("points.redeem")}
						<ChevronRight size={16} aria-hidden />
					</span>
				</button>
			) : null}

			{errorCode ? <p className="account-error">{errorMessage(tAccount, errorCode)}</p> : null}

			{live ? (
				<section className="account-card-block account-live" aria-label={t("liveTitle")}>
					<div className="account-live-head">
						<div className="account-order-main">
							<span className="account-live-title">{tOrders("number", { number: live.number })}</span>
							<OrderMeta order={live} />
						</div>
						<OrderStatusPill status={live.status} />
					</div>
					<OrderTracker order={live} />
					<button type="button" className="account-button account-button--primary account-button--block" onClick={() => onOpenOrder(live.id)}>
						{t("viewOrder")}
					</button>
				</section>
			) : null}

			<div className="account-quick-grid">
				{lastRepeatable ? (
					<QuickAction
						icon={<RotateCcw size={20} />}
						title={<AccountBusyLabel busy={repeating} idle={t("quick.repeat")} working={tOrders("repeating")} />}
						sub={t("quick.repeatSub")}
						onClick={handleRepeat}
						disabled={repeating}
					/>
				) : (
					<QuickAction
						icon={<UtensilsCrossed size={20} />}
						title={t("quick.menu")}
						sub={t("quick.menuSub")}
						href={menuPath()}
					/>
				)}
				<QuickAction
					icon={<MapPin size={20} />}
					title={t("quick.addresses")}
					sub={t("quick.addressesSub")}
					onClick={() => onGo("addresses")}
				/>
				<QuickAction
					icon={<UserRound size={20} />}
					title={t("quick.profile")}
					sub={t("quick.profileSub")}
					onClick={() => onGo("settings")}
				/>
			</div>

			<section className="account-home-recent">
				<div className="account-home-recent-head">
					<h3 className="account-home-heading">{t("recent")}</h3>
					{orders && orders.length > 0 ? (
						<button type="button" className="account-text-button" onClick={() => onGo("orders")}>
							{t("seeAll")}
						</button>
					) : null}
				</div>
				{loading ? <p className="account-note">{tOrders("loading")}</p> : null}
				{orders !== null && orders.length === 0 ? (
					<div className="account-empty">
						<p>{tOrders("empty")}</p>
						<Link href={menuPath()} className="account-button account-button--primary">
							<UtensilsCrossed size={16} aria-hidden />
							{tOrders("orderNow")}
						</Link>
					</div>
				) : null}
				{recent.length > 0 ? (
					<ul className="account-order-list">
						{recent.map((order) => (
							<li key={order.id}>
								<OrderCard order={order} onOpen={() => onOpenOrder(order.id)} />
							</li>
						))}
					</ul>
				) : null}
			</section>
		</div>
	);
}
