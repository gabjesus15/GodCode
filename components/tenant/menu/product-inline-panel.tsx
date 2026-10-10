"use client";

import { useEffect } from "react";
import { Minus, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCartStore } from "../cart/cart-store";
import { formatCartMoney } from "../cart/utils/format-cart-money";
import { isVenezuelaCountry } from "@/lib/geo/venezuela";
import { FromPriceLabel } from "./product-card-shared";
import { ProductThumb } from "./product-photo-fallback";
import { useSizePickerStore } from "./product-size-store";
import { minSizePrice } from "@/lib/tenant/product-sizes";
import { productNeedsConfiguration } from "@/lib/tenant/product-variants";
import type { MenuProduct } from "./menu-types";

export function ProductInlinePanel({
	product,
	currency,
	country,
	exchangeRate,
	onlineOrderingEnabled,
	onClose,
	panelRef,
}: {
	product: MenuProduct;
	currency: string;
	country: string;
	exchangeRate?: number | null;
	onlineOrderingEnabled?: boolean;
	onClose: () => void;
	panelRef?: React.RefObject<HTMLDivElement | null>;
}) {
	const t = useTranslations("tenant.menu");
	const displayName = product.name || t("card.productFallback");
	const addToCart = useCartStore((state) => state.addToCart);
	const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
	const openSizePicker = useSizePickerStore((state) => state.open);
	const fromSizes = minSizePrice(product.sizes);
	const add = () => {
		if (productNeedsConfiguration(product)) openSizePicker(product);
		else addToCart?.(product);
	};
	const cart = useCartStore((state) => state.cart);
	const quantity = cart.reduce(
		(sum: number, item: { id: string; quantity: number }) =>
			item.id === product.id ? sum + (Number(item.quantity) || 0) : sum,
		0,
	);
	const showUSD = isVenezuelaCountry(country);

	const formatPrice = (priceVal: number) => {
		const primaryStr = showUSD
			? formatCartMoney(priceVal, "USD")
			: formatCartMoney(priceVal, currency);
		if (exchangeRate && exchangeRate > 0 && !showUSD) {
			const localCode = currency === "USD" || showUSD ? "VES" : "USD";
			return `${primaryStr} / ${formatCartMoney(priceVal * exchangeRate, localCode)}`;
		}
		return primaryStr;
	};

	const displayPrice = fromSizes != null
		? formatPrice(fromSizes)
		: product.has_discount && product.discount_price
			? formatPrice(product.discount_price)
			: formatPrice(product.price);

	useEffect(() => {
		panelRef?.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
	}, [panelRef]);

	return (
		<div ref={panelRef} className="product-inline-panel">
			<button
				type="button"
				className="product-inline-panel__close"
				onClick={onClose}
				aria-label={t("card.closeDetails")}
			>
				<X size={18} />
			</button>

			<div className="product-inline-panel__inner">
				<div className="product-inline-panel__img-wrap">
					<ProductThumb
						src={product.image_url}
						name={displayName}
						alt={displayName}
						fill
						className="product-inline-panel__img"
						fallbackClassName="product-inline-panel__initial"
						sizes="160px"
						quality={75}
					/>
				</div>

				<div className="product-inline-panel__body">
					<h3 className="product-inline-panel__name">{product.name}</h3>
					{product.description && (
						<p className="product-inline-panel__desc">{product.description}</p>
					)}
					<div className="product-inline-panel__footer">
						<div className="product-inline-panel__price-row">
							{product.has_discount && product.discount_price ? (
								<>
									<span className="product-inline-panel__price discounted">{displayPrice}</span>
									<span className="product-inline-panel__price original">
										{formatPrice(product.price)}
									</span>
								</>
							) : (
								<span className="product-inline-panel__price">
									{fromSizes != null ? <FromPriceLabel className="product-inline-panel__price-from" /> : null}
									{displayPrice}
								</span>
							)}
						</div>

						{onlineOrderingEnabled !== false && (
							quantity === 0 ? (
								<button
									type="button"
									className="product-inline-panel__add-btn"
									onClick={add}
									aria-label={t("card.addAria", { name: product.name ?? t("card.productFallback") })}
								>
									<Plus size={16} />
									{t("card.add")}
								</button>
							) : (
								<div className="product-inline-panel__stepper">
									<button
										type="button"
										onClick={() => decreaseQuantity?.(product.id)}
										aria-label={t("card.removeOne")}
									>
										<Minus size={14} />
									</button>
									<span>{quantity}</span>
									<button
										type="button"
										onClick={add}
										aria-label={t("card.addOne")}
									>
										<Plus size={14} />
									</button>
								</div>
							)
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
