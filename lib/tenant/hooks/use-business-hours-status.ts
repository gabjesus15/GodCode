"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import {
	getBusinessHoursStatus,
	hasAnyBusinessHours,
	normalizeBusinessHours,
	resolveBusinessTimeZone,
	type BusinessHoursStatus,
} from "../business-hours";

const TICK_MS = 30_000;
const NOT_ENFORCED: BusinessHoursStatus = { enforced: false };

/**
 * Si la sucursal está dentro de su horario, re-evaluado cada 30 s: quien deja el menú
 * abierto a las 22:59 ve que se cierra a las 23:00 sin recargar. Antes de montar no
 * bloquea (la hora del servidor no sirve para pintar). Úsalo en componentes chicos: el
 * reloj vuelve a renderizar a quien lo llama.
 */
export function useBusinessHoursStatus(
	branch: { business_hours?: unknown; country?: string | null } | null | undefined,
	active = true,
): BusinessHoursStatus {
	const rawHours = branch?.business_hours;
	const country = branch?.country ?? null;
	const hours = useMemo(() => normalizeBusinessHours(rawHours), [rawHours]);
	const enforceable = Boolean(hours?.enabled) && hasAnyBusinessHours(hours);

	const [now, setNow] = useState<Date | null>(null);
	useEffect(() => {
		if (!enforceable || !active) return;
		const tick = () => setNow(new Date());
		const first = window.setTimeout(tick, 0);
		const timer = window.setInterval(tick, TICK_MS);
		return () => {
			window.clearTimeout(first);
			window.clearInterval(timer);
		};
	}, [enforceable, active]);

	return useMemo(
		() =>
			enforceable && now
				? getBusinessHoursStatus(hours, { now, fallbackTimeZone: resolveBusinessTimeZone(country) })
				: NOT_ENFORCED,
		[enforceable, hours, now, country],
	);
}

/** "Volvemos a recibir pedidos hoy a las 12:00." o `null` si está abierto. */
export function useBusinessHoursClosedMessage(status: BusinessHoursStatus): string | null {
	const t = useTranslations("tenant.hours");
	const locale = useLocale();
	if (!status.enforced || status.open) return null;
	const next = status.nextOpen;
	if (!next) return t("closedNoNext");
	if (next.dayOffset === 0) return t("opensToday", { time: next.time });
	if (next.dayOffset === 1) return t("opensTomorrow", { time: next.time });
	// 2026-01-04 fue domingo: sumar el día de la semana da una fecha con ese nombre.
	const day = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
		new Date(Date.UTC(2026, 0, 4 + next.weekday)),
	);
	return t("opensOn", { day, time: next.time });
}
