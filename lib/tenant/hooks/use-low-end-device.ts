"use client";

import { useEffect, useState } from "react";

import { detectLowEndDevice } from "@/lib/tenant/device/low-end-device";

/** Detecta gama baja tras el primer paint (evita hydration mismatch). */
export function useLowEndDevice(): boolean {
	const [isLowEnd, setIsLowEnd] = useState(false);

	useEffect(() => {
		const timer = window.setTimeout(() => {
			setIsLowEnd(detectLowEndDevice());
		}, 0);

		return () => window.clearTimeout(timer);
	}, []);

	return isLowEnd;
}
