"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DeliverySettingsNormalized } from "@/lib/delivery/delivery-settings";
import type { CheckoutEnhancePanel } from "@/lib/tenant/mobile/checkout-session";
import type { CartLineItem } from "../cart-modal-types";
import { useCart } from "../use-cart";
import type { EnhancementCatalogs } from "../utils/enhancement-catalogs";
import { CartEmptyState } from "./cart-empty-state";
import { CartEnhanceRail } from "./cart-enhance-rail";
import { CartLine } from "./cart-line";
import { CartTotals } from "./cart-totals";

export function CartSummaryBody({
	lines,
	onBackToMenu,
	accountCompanyId,
}: {
	lines: CartLineItem[];
	onBackToMenu: () => void;
	/** Solo con sesión en "Mi cuenta": habilita "repetir último pedido" en el vacío. */
	accountCompanyId?: string | null;
}) {
	const { getPrice, addToCart, decreaseQuantity, removeFromCart, setLineNote } = useCart();
	if (lines.length === 0) return <CartEmptyState onMenu={onBackToMenu} accountCompanyId={accountCompanyId} />;
	return (
		<ul className="cart-lines">
			{lines.map((item, index) => (
				<CartLine
					key={item.lineId ?? item.id}
					index={index}
					item={item}
					unitPrice={getPrice(item)}
					onAdd={addToCart}
					onDecrease={decreaseQuantity}
					onRemove={removeFromCart}
					onNoteChange={setLineNote}
				/>
			))}
		</ul>
	);
}

export type CartSummaryFootProps = {
	settings: DeliverySettingsNormalized;
	catalogs: EnhancementCatalogs;
	showBeverages: boolean;
	showExtras: boolean;
	showCoupon: boolean;
	activePanel: CheckoutEnhancePanel;
	onTogglePanel: (panel: CheckoutEnhancePanel) => void;
	branchId: string | null;
	clientPhone: string;
	cta:
		| { kind: "loading" }
		| { kind: "paused" }
		| { kind: "closed"; message: string }
		| { kind: "ready"; onContinue: () => void };
};

export function CartSummaryFoot({
	settings,
	catalogs,
	showBeverages,
	showExtras,
	showCoupon,
	activePanel,
	onTogglePanel,
	branchId,
	clientPhone,
	cta,
}: CartSummaryFootProps) {
	const t = useTranslations("tenant.cart.modal");
	return (
		<>
			<CartEnhanceRail
				catalogs={catalogs}
				showBeverages={showBeverages}
				showExtras={showExtras}
				showCoupon={showCoupon}
				active={activePanel}
				onToggle={onTogglePanel}
				branchId={branchId}
				clientPhone={clientPhone}
			/>
			<CartTotals settings={settings} />
			{cta.kind === "loading" ? (
				<button type="button" className="cart-cta" disabled>
					{t("actions.loading")}
				</button>
			) : cta.kind === "paused" ? (
				<button type="button" className="cart-cta" disabled>
					{t("intake.paused")}
				</button>
			) : cta.kind === "closed" ? (
				<p className="cart-blocker" role="status">
					<AlertCircle size={16} aria-hidden />
					<span>{cta.message}</span>
				</p>
			) : (
				<button type="button" className="cart-cta" onClick={cta.onContinue}>
					{t("actions.goToPay")}
				</button>
			)}
		</>
	);
}
