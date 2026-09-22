import { parseThemeColor } from "@/lib/store-theme/apply-theme-css-vars";

export type SurfaceScheme = "light" | "dark";

/**
 * Luminancia relativa (WCAG) de un hex #rrggbb. Copia mínima de la de
 * `store-theme-utils` para no arrastrar el editor de tema al bundle del menú.
 */
function luminance(hex: string): number {
	const channel = (value: number) => {
		const n = value / 255;
		return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
	};
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);
	return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Por debajo el fondo se lee oscuro y las superficies del menú van en oscuro. */
const LIGHT_THRESHOLD = 0.4;

/**
 * Decide si las superficies del menú (carrito, hojas) van claras u oscuras a
 * partir del color de fondo que configuró el local. Acepta hex, rgb(a) o
 * `transparent`; un fondo casi transparente deja ver el `#0a0a0a` del sitio,
 * así que cuenta como oscuro.
 */
export function resolveSurfaceScheme(backgroundColor: string | null | undefined): SurfaceScheme {
	const parsed = parseThemeColor(String(backgroundColor ?? "").trim(), "#0a0a0a");
	if (parsed.alpha < 0.05) return "dark";
	return luminance(parsed.hex) >= LIGHT_THRESHOLD ? "light" : "dark";
}
