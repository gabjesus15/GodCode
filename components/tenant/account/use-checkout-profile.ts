"use client";

import { useEffect, useState } from "react";

import { MENU_ACCOUNT_ENABLED } from "@/lib/menu-account/feature";

import type { MenuAccountCheckoutProfile } from "./menu-account-types";

export type CheckoutProfileState = {
	/** Perfil de la persona logueada, o `null` si no hay sesión (o aún no se sabe). */
	profile: MenuAccountCheckoutProfile | null;
	/**
	 * La API confirmó, en esta apertura del carrito, que no hay sesión. Mientras carga o
	 * si la petición falla queda en `false`: a quien tiene sesión nunca se le trata como
	 * invitado por una respuesta que no llegó.
	 */
	isGuest: boolean;
};

/**
 * Perfil de checkout de la persona logueada en el menú.
 *
 * Es solo un extra: el checkout nunca lo espera ni depende de él. Sin sesión, o si la
 * petición falla, se compra igual que siempre con los campos vacíos; con sesión, los
 * datos se rellenan cuando llegan.
 *
 * Se pide cada vez que se abre el carrito: la sesión puede haber empezado o terminado
 * en `/mi-cuenta` sin recargar el menú.
 */
export function useCheckoutProfile(
	companyId: string | null | undefined,
	isCartOpen: boolean,
): CheckoutProfileState {
	const [profile, setProfile] = useState<MenuAccountCheckoutProfile | null>(null);
	const [isGuest, setIsGuest] = useState(false);

	// Cada apertura (o cambio de negocio) olvida el "sin sesión" anterior hasta que la
	// API vuelva a confirmarlo: pudo haber entrado a su cuenta mientras tanto.
	const openKey = isCartOpen && companyId ? companyId : null;
	const [seenOpenKey, setSeenOpenKey] = useState(openKey);
	if (seenOpenKey !== openKey) {
		setSeenOpenKey(openKey);
		setIsGuest(false);
	}

	useEffect(() => {
		if (!MENU_ACCOUNT_ENABLED || !isCartOpen || !companyId) return;

		const controller = new AbortController();
		fetch(`/api/menu-account/checkout-profile?companyId=${encodeURIComponent(companyId)}`, {
			credentials: "include",
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) {
					setProfile(null);
					return;
				}
				const payload = (await response.json()) as { profile?: MenuAccountCheckoutProfile };
				setProfile(payload.profile ?? null);
				setIsGuest(!payload.profile);
			})
			.catch(() => {
				if (!controller.signal.aborted) setProfile(null);
			});

		return () => controller.abort();
	}, [companyId, isCartOpen]);

	return { profile, isGuest };
}
