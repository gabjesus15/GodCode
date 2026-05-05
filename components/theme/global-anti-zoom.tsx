"use client";

import { useAntiZoom } from "../tenant/hooks/use-anti-zoom";

/** Activo en todas las rutas (layout raíz): sin zoom por accesos del navegador/OS. */
export function GlobalAntiZoom() {
	useAntiZoom();
	return null;
}
