"use client";

import clsx from "clsx";
import { Check, CupSoda, Plus, Sparkles, Ticket } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CheckoutEnhancePanel } from "@/lib/tenant/mobile/checkout-session";
import { ENHANCE_CATALOG_BEVERAGE_FALLBACK, ENHANCE_CATALOG_EXTRA_FALLBACK } from "../constants";
import { useCart } from "../use-cart";
import type { EnhancementCatalogItem, EnhancementCatalogs } from "../utils/enhancement-catalogs";
import { formatCartMoney } from "../utils/format-cart-money";
import { CartCouponFields } from "./cart-coupon-fields";
import { CartEnhanceCatalogGlyph } from "./cart-enhance-catalog-glyph";

export type CartEnhanceRailProps = {
	catalogs: EnhancementCatalogs;
	showBeverages: boolean;
	showExtras: boolean;
	showCoupon: boolean;
	active: CheckoutEnhancePanel;
	onToggle: (panel: CheckoutEnhancePanel) => void;
	branchId: string | null;
	clientPhone: string;
};

function CatalogRow({
	item,
	index,
	selected,
	onPick,
	fallbackSrc,
	currency,
	selectedLabel,
	addLabel,
}: {
	item: EnhancementCatalogItem;
	index: number;
	selected: boolean;
	onPick: () => void;
	fallbackSrc: string;
	currency: string;
	selectedLabel: string;
	addLabel: string;
}) {
	return (
		<li
			className={clsx("cart-pick", selected && "is-selected")}
			style={{ "--i": Math.min(index, 5) } as React.CSSProperties}
		>
			<button type="button" className="cart-pick__body" onClick={onPick} aria-label={addLabel}>
				<CartEnhanceCatalogGlyph
					key={`${item.id}-${item.image_url ?? ""}`}
					imageUrl={item.image_url}
					fallbackSrc={fallbackSrc}
				/>
				<span className="cart-pick__text">
					<span className="cart-pick__name">{item.name}</span>
					<span className="cart-pick__price">
						{selected ? selectedLabel : formatCartMoney(item.price, currency)}
					</span>
				</span>
				<span className={clsx("cart-pick__action", selected && "is-selected")} aria-hidden>
					{selected ? <Check size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2.5} />}
				</span>
			</button>
		</li>
	);
}

/**
 * Bebidas, extras globales y cupón: tres pestañas discretas sobre los totales.
 * El panel abierto empuja el contenido (nada flota ni se solapa).
 */
export function CartEnhanceRail({
	catalogs,
	showBeverages,
	showExtras,
	showCoupon,
	active,
	onToggle,
	branchId,
	clientPhone,
}: CartEnhanceRailProps) {
	const t = useTranslations("tenant.cart.modal");
	const { currency, cartSubtotal, globalExtras, setGlobalExtras, addToCart, appliedCouponCode } =
		useCart();

	type Tab = { key: CheckoutEnhancePanel; label: string; icon: React.ReactNode; on: boolean };
	const allTabs: Tab[] = [
		{ key: "beverages", label: t("catalog.beveragesTab"), icon: <CupSoda size={15} aria-hidden />, on: showBeverages },
		{ key: "extras", label: t("catalog.extrasTab"), icon: <Sparkles size={15} aria-hidden />, on: showExtras },
		{ key: "coupon", label: t("coupon.segLabel"), icon: <Ticket size={15} aria-hidden />, on: showCoupon },
	];
	const tabs = allTabs.filter((tab) => tab.on);

	if (tabs.length === 0) return null;

	const toggleExtra = (extra: EnhancementCatalogItem) => {
		const exists = globalExtras.some((entry) => entry.id === extra.id);
		setGlobalExtras(
			exists
				? globalExtras.filter((entry) => entry.id !== extra.id)
				: [...globalExtras, { id: extra.id, name: extra.name, price: extra.price, qty: 1 }],
		);
	};

	const addBeverage = (beverage: EnhancementCatalogItem) => {
		addToCart(
			{
				id: `upsell_beverage_${beverage.id}`,
				name: beverage.name,
				description: t("catalog.suggestedDrink"),
				image_url: null,
				price: beverage.price,
				has_discount: false,
				discount_price: null,
				is_active: true,
			},
			{ selectedBeverages: [{ id: beverage.id, name: beverage.name, price: beverage.price, qty: 1 }] },
		);
	};

	return (
		<div className="cart-enhance">
			<div className="cart-chips" role="group" aria-label={t("catalog.addDrinksOrExtras")}>
				{tabs.map((tab) => {
					const isActive = active === tab.key;
					const highlighted = isActive || (tab.key === "coupon" && Boolean(appliedCouponCode));
					return (
						<button
							key={tab.key}
							type="button"
							aria-pressed={isActive}
							className={clsx("cart-chip", highlighted && "is-active")}
							onClick={() => onToggle(isActive ? "none" : tab.key)}
						>
							{tab.icon}
							<span>{tab.label}</span>
						</button>
					);
				})}
			</div>

			<div className={clsx("cart-enhance__panel", active !== "none" && "is-open")} aria-hidden={active === "none"}>
				<div className="cart-enhance__inner" key={active}>
					{active === "coupon" ? (
						<CartCouponFields branchId={branchId} cartSubtotal={cartSubtotal} currency={currency} clientPhone={clientPhone} />
					) : active === "beverages" ? (
						<ul className="cart-pick-list">
							{catalogs.beverages.map((beverage, index) => (
								<CatalogRow
									key={beverage.id}
									index={index}
									item={beverage}
									selected={false}
									onPick={() => addBeverage(beverage)}
									fallbackSrc={ENHANCE_CATALOG_BEVERAGE_FALLBACK}
									currency={currency}
									selectedLabel={t("catalog.inYourOrder")}
									addLabel={t("catalog.addItemAria", { name: beverage.name })}
								/>
							))}
						</ul>
					) : active === "extras" ? (
						<ul className="cart-pick-list">
							{catalogs.globalExtras.map((extra, index) => (
								<CatalogRow
									key={extra.id}
									index={index}
									item={extra}
									selected={globalExtras.some((entry) => entry.id === extra.id)}
									onPick={() => toggleExtra(extra)}
									fallbackSrc={ENHANCE_CATALOG_EXTRA_FALLBACK}
									currency={currency}
									selectedLabel={t("catalog.inYourOrder")}
									addLabel={t("catalog.addItemAria", { name: extra.name })}
								/>
							))}
						</ul>
					) : null}
				</div>
			</div>
		</div>
	);
}
