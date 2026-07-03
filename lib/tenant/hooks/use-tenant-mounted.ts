"use client";

import { useEffect, useState } from "react";

/** Evita hydration mismatch en componentes client-only del tenant */
export function useTenantMounted(): boolean {
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		const timer = window.setTimeout(() => setMounted(true), 0);
		return () => window.clearTimeout(timer);
	}, []);
	return mounted;
}
