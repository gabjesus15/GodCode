"use client";

import { useEffect, useState } from "react";

import { resolveSurfaceScheme, type SurfaceScheme } from "@/lib/tenant/theme/surface-scheme";

const THEME_ROOT_SELECTOR = ".tenant-theme-vars";

function readScheme(): SurfaceScheme {
	if (typeof document === "undefined") return "dark";
	const root = document.querySelector<HTMLElement>(THEME_ROOT_SELECTOR) ?? document.documentElement;
	const background = getComputedStyle(root).getPropertyValue("--bg-primary");
	return resolveSurfaceScheme(background);
}

/**
 * Claro u oscuro según el fondo del local (`--bg-primary`). Se lee del DOM y no
 * de props porque el tema llega por `<style>` en SSR y por `setProperty` en el
 * preview del panel: observar el nodo cubre los dos caminos sin enhebrar nada.
 */
export function useTenantSurfaceScheme(): SurfaceScheme {
	const [scheme, setScheme] = useState<SurfaceScheme>("dark");

	useEffect(() => {
		const sync = () => setScheme(readScheme());
		sync();
		const root = document.querySelector<HTMLElement>(THEME_ROOT_SELECTOR);
		const observer = new MutationObserver(sync);
		if (root) observer.observe(root, { attributes: true, attributeFilter: ["style"] });
		observer.observe(document.head, { childList: true });
		return () => observer.disconnect();
	}, []);

	return scheme;
}

/**
 * Publica el esquema como `data-scheme` en el nodo del tema, que envuelve
 * también los portales (header, barra inferior, modales): así el CSS de
 * superficie del menú lo ve desde cualquier sitio, no solo bajo `.page-wrapper`.
 */
export function useApplyTenantSurfaceScheme(): SurfaceScheme {
	const scheme = useTenantSurfaceScheme();
	useEffect(() => {
		const root = document.querySelector<HTMLElement>(THEME_ROOT_SELECTOR);
		if (!root) return;
		root.dataset.scheme = scheme;
		return () => {
			delete root.dataset.scheme;
		};
	}, [scheme]);
	return scheme;
}
