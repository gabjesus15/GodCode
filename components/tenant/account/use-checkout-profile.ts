"use client";

import { useEffect, useState } from "react";

import { MENU_ACCOUNT_ENABLED } from "@/lib/menu-account/feature";

import type { MenuAccountCheckoutProfile } from "./menu-account-types";

/**
 * Perfil de checkout de la persona logueada en el menú, o `null` si no hay sesión.
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
): MenuAccountCheckoutProfile | null {
	const [profile, setProfile] = useState<MenuAccountCheckoutProfile | null>(null);

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
			})
			.catch(() => {
				if (!controller.signal.aborted) setProfile(null);
			});

		return () => controller.abort();
	}, [companyId, isCartOpen]);

	return profile;
}
