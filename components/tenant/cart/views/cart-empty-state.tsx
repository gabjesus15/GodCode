"use client";

import { useEffect, useState } from "react";
import { RotateCcw, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import type { MenuAccountOrder } from "../../account/menu-account-types";
import { repeatableItems, useRepeatOrder } from "../../account/use-repeat-order";

/**
 * Mismo icono que la pestaña de carrito de la barra inferior: pulsaste ahí, esto es lo que hay.
 *
 * `accountCompanyId` llega solo con sesión en "Mi cuenta": habilita el atajo de
 * repetir el último pedido, debajo de volver al menú.
 */
export function CartEmptyState({ onMenu, accountCompanyId }: { onMenu: () => void; accountCompanyId?: string | null }) {
	const t = useTranslations("tenant.cart.modal");
	return (
		<div className="cart-empty">
			<span className="cart-empty__icon" aria-hidden>
				<ShoppingBag size={28} strokeWidth={1.6} />
			</span>
			<h3 className="cart-empty__title">{t("empty.title")}</h3>
			<p className="cart-empty__hint">{t("empty.subtitle")}</p>
			<button type="button" className="cart-secondary-btn" onClick={onMenu}>
				{t("actions.backToMenu")}
			</button>
			{accountCompanyId ? <RepeatLastOrderButton companyId={accountCompanyId} /> : null}
		</div>
	);
}

/**
 * Solo se dibuja si hay algo que repetir: sin pedidos, o con un último pedido de
 * líneas manuales del POS (sin producto del catálogo), no aparece nada. Mientras
 * carga tampoco, para que el vacío no dé un salto al abrir el carrito.
 */
function RepeatLastOrderButton({ companyId }: { companyId: string }) {
	const t = useTranslations("tenant.cart.modal");
	const { repeatOrder } = useRepeatOrder();
	const [order, setOrder] = useState<MenuAccountOrder | null>(null);
	const [repeating, setRepeating] = useState(false);

	useEffect(() => {
		const controller = new AbortController();
		fetch(`/api/menu-account/last-order?companyId=${encodeURIComponent(companyId)}`, {
			credentials: "include",
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) return;
				const payload = (await response.json()) as { order?: MenuAccountOrder | null };
				setOrder(payload.order ?? null);
			})
			// El fallo no se anuncia: es un atajo, y el carrito vacío ya tiene su salida.
			.catch(() => undefined);
		return () => controller.abort();
	}, [companyId]);

	if (!order || repeatableItems(order).length === 0) return null;

	return (
		<button
			type="button"
			className="cart-secondary-btn cart-empty__repeat"
			disabled={repeating}
			onClick={() => {
				// Deshabilitado hasta que navegue: `repeatOrder` reescribe el carrito y
				// empuja la ruta, y un segundo clic duplicaría ese trabajo.
				setRepeating(true);
				void repeatOrder(order).then((ok) => {
					if (!ok) setRepeating(false);
				});
			}}
		>
			<RotateCcw size={16} aria-hidden />
			<span>{t("actions.repeatLastOrder")}</span>
		</button>
	);
}
