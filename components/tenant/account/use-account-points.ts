"use client";

import { useEffect, useState } from "react";

import type { LoyaltyEarnRule } from "@/lib/loyalty/earn-rules-shared";

import { useMenuAccount } from "./use-menu-account";

/**
 * Puntos de la cuenta en este negocio (`GET /api/menu-account/points`) y las reglas
 * activas con que se ganan. `points` es null mientras carga o si la petición falla: la
 * tarjeta simplemente no se muestra. `setPoints` lo usa la sección Puntos para dejar el
 * saldo al día después de un canje.
 */
export function useAccountPoints(companySlug: string) {
	const { run } = useMenuAccount("login");
	const [points, setPoints] = useState<number | null>(null);
	const [earnRules, setEarnRules] = useState<LoyaltyEarnRule[]>([]);

	useEffect(() => {
		let cancelled = false;
		void run<{ points: number; earnRules?: LoyaltyEarnRule[] }>(
			`points?companySlug=${encodeURIComponent(companySlug)}`,
			{ method: "GET" },
		).then((result) => {
			if (cancelled || !result.ok || !Number.isFinite(result.data.points)) return;
			setPoints(result.data.points);
			setEarnRules(result.data.earnRules ?? []);
		});
		return () => {
			cancelled = true;
		};
	}, [companySlug, run]);

	return { points, earnRules, setPoints };
}
