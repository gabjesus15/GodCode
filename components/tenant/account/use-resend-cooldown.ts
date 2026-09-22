"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Cuenta atrás tras reenviar un código: evita tocar "reenviar" en ráfaga (el
 * servidor limita por IP y respondería 429) y le dice a la persona cuánto falta.
 */
export function useResendCooldown(seconds = 30) {
	const [remaining, setRemaining] = useState(0);

	useEffect(() => {
		if (remaining <= 0) return;
		const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [remaining]);

	const start = useCallback(() => setRemaining(seconds), [seconds]);

	return { remaining, active: remaining > 0, start };
}
