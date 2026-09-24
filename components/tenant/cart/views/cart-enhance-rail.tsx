"use client";

import clsx from "clsx";
import { CupSoda, Minus, Plus, Sparkles, Ticket, Trash2 } from "lucide-react";
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

/** Tope por extra global, igual que el de una línea de producto. */
const MAX_GLOBAL_EXTRA_QTY = 20;

type CatalogRowStepper = {
	quantity: number;
	onIncrease: () => void;
	onDecrease: () => void;
	labels: { quantity: string; increase: string; decrease: string; remove: string };
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
	stepper,
}: {
	item: EnhancementCatalogItem;
	index: number;
	selected: boolean;
	onPick: () => void;
	fallbackSrc: string;
	currency: string;
	selectedLabel: string;
	addLabel: string;
	/** Con el ítem ya en el pedido, la fila muestra − cantidad + en vez de un toggle. */
	stepper?: CatalogRowStepper;
}) {
	const glyph = (
		<CartEnhanceCatalogGlyph
			key={`${item.id}-${item.image_url ?? ""}`}
			imageUrl={item.image_url}
			fallbackSrc={fallbackSrc}
		/>
	);
	const style = { "--i": Math.min(index, 5) } as React.CSSProperties;

	if (selected && stepper) {
		const { quantity, onIncrease, onDecrease, labels } = stepper;
		const isLast = quantity <= 1;
		return (
			<li className="cart-pick is-selected" style={style}>
				<div className="cart-pick__body cart-pick__body--static">
					{glyph}
					<span className="cart-pick__text">
						<span className="cart-pick__name">{item.name}</span>
						<span className="cart-pick__price">
							{selectedLabel} · {formatCartMoney(item.price * quantity, currency)}
						</span>
					</span>
					<div className="cart-stepper" role="group" aria-label={labels.quantity}>
						<button
							type="button"
							className={clsx("cart-stepper__btn", isLast && "cart-stepper__btn--remove")}
							onClick={onDecrease}
							aria-label={isLast ? labels.remove : labels.decrease}
						>
							{isLast ? <Trash2 size={14} aria-hidden /> : <Minus size={14} aria-hidden />}
						</button>
						<span className="cart-stepper__value" aria-live="polite">
							{quantity}
						</span>
						<button
							type="button"
							className="cart-stepper__btn"
							onClick={onIncrease}
							disabled={quantity >= MAX_GLOBAL_EXTRA_QTY}
							aria-label={labels.increase}
						>
							<Plus size={14} aria-hidden />
						</button>
					</div>
				</div>
			</li>
		);
	}

	return (
		<li className={clsx("cart-pick", selected && "is-selected")} style={style}>
			<button type="button" className="cart-pick__body" onClick={onPick} aria-label={addLabel}>
				{glyph}
				<span className="cart-pick__text">
					<span className="cart-pick__name">{item.name}</span>
					<span className="cart-pick__price">
						{selected ? selectedLabel : formatCartMoney(item.price, currency)}
					</span>
				</span>
				<span className="cart-pick__action" aria-hidden>
					<Plus size={16} strokeWidth={2.5} />
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

	const addExtra = (extra: EnhancementCatalogItem) => {
		if (globalExtras.some((entry) => entry.id === extra.id)) return;
		setGlobalExtras([...globalExtras, { id: extra.id, name: extra.name, price: extra.price, qty: 1 }]);
	};

	/** Suma o resta una unidad; al bajar de 1 el extra sale del pedido. */
	const stepExtra = (extraId: string, delta: 1 | -1) => {
		setGlobalExtras(
			globalExtras.flatMap((entry) => {
				if (entry.id !== extraId) return [entry];
				const qty = Math.min(MAX_GLOBAL_EXTRA_QTY, entry.qty + delta);
				return qty < 1 ? [] : [{ ...entry, qty }];
			}),
		);
	};

	const stepperLabels = {
		quantity: t("item.quantityAria"),
		increase: t("item.increaseQuantity"),
		decrease: t("item.decreaseQuantity"),
		remove: t("item.removeProduct"),
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
							{catalogs.globalExtras.map((extra, index) => {
								const inOrder = globalExtras.find((entry) => entry.id === extra.id);
								return (
									<CatalogRow
										key={extra.id}
										index={index}
										item={extra}
										selected={Boolean(inOrder)}
										onPick={() => addExtra(extra)}
										fallbackSrc={ENHANCE_CATALOG_EXTRA_FALLBACK}
										currency={currency}
										selectedLabel={t("catalog.inYourOrder")}
										addLabel={t("catalog.addItemAria", { name: extra.name })}
										stepper={
											inOrder
												? {
														quantity: inOrder.qty,
														onIncrease: () => stepExtra(extra.id, 1),
														onDecrease: () => stepExtra(extra.id, -1),
														labels: stepperLabels,
													}
												: undefined
										}
									/>
								);
							})}
						</ul>
					) : null}
				</div>
			</div>
		</div>
	);
}
