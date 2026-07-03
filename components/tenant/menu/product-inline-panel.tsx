"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";

import { useCartStore } from "../cart/cart-store";
import { formatCartMoney } from "../cart/utils/format-cart-money";
import { isCloudinaryUrl } from "../utils/cloudinary";
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
	const addToCart = useCartStore((state) => state.addToCart);
	const decreaseQuantity = useCartStore((state) => state.decreaseQuantity);
	const cart = useCartStore((state) => state.cart);
	const quantity = cart.reduce(
		(sum: number, item: { id: string; quantity: number }) =>
			item.id === product.id ? sum + (Number(item.quantity) || 0) : sum,
		0,
	);
	const showUSD = country === "VE" || country === "Venezuela";
	const isCloudinary = isCloudinaryUrl(product.image_url);

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

	const displayPrice = product.has_discount && product.discount_price
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
				aria-label="Cerrar detalle"
			>
				<X size={18} />
			</button>

			<div className="product-inline-panel__inner">
				{product.image_url && (
					<div className="product-inline-panel__img-wrap">
						<Image
							src={product.image_url}
							alt={product.name ?? "Producto"}
							fill
							className="product-inline-panel__img"
							sizes="160px"
							unoptimized={!isCloudinary}
						/>
					</div>
				)}

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
								<span className="product-inline-panel__price">{displayPrice}</span>
							)}
						</div>

						{onlineOrderingEnabled !== false && (
							quantity === 0 ? (
								<button
									type="button"
									className="product-inline-panel__add-btn"
									onClick={() => addToCart?.(product)}
									aria-label={`Agregar ${product.name} al carrito`}
								>
									<Plus size={16} />
									Agregar
								</button>
							) : (
								<div className="product-inline-panel__stepper">
									<button
										type="button"
										onClick={() => decreaseQuantity?.(product.id)}
										aria-label="Disminuir cantidad"
									>
										<Minus size={14} />
									</button>
									<span>{quantity}</span>
									<button
										type="button"
										onClick={() => addToCart?.(product)}
										aria-label="Aumentar cantidad"
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
