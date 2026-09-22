import type { StoreThemeConfig } from "@/components/customer-portal/shared/customer-account-types";
import {
	STORE_THEME_FONTS,
	normalizeBrandNameColor,
	normalizeFontFamily,
	normalizeSurfaceScheme,
} from "./theme-config";

/**
 * Ajustes de superficie del menú: modo claro/oscuro, color del nombre del local
 * y tipografía.
 *
 * Van en un bloque CSS aparte y NO en el contrato de variables compartido con
 * el Panel (`theme-css-var-contract.ts`): ese fichero tiene que ser idéntico en
 * los dos repositorios y el Panel no pinta el menú público, así que no tiene
 * por qué conocer estos tokens. El menú los lee con `var(--x, respaldo)` y
 * sigue funcionando si faltan.
 */

export const TENANT_SURFACE_CSS_VARS = ["--tenant-surface-scheme", "--tenant-font", "--menu-brand-color"] as const;

export type TenantSurfaceVars = {
	surfaceScheme: "auto" | "light" | "dark";
	/** `var(--font-x), "Nombre", generic` listo para font-family. */
	fontStack: string;
	/** Hex o cadena vacía (= automático: el color de marca). */
	brandNameColor: string;
};

export function resolveTenantSurfaceVars(theme: Partial<StoreThemeConfig>): TenantSurfaceVars {
	const fontId = normalizeFontFamily(theme.fontFamily);
	const font = STORE_THEME_FONTS.find((entry) => entry.id === fontId) ?? STORE_THEME_FONTS[0];
	return {
		surfaceScheme: normalizeSurfaceScheme(theme.surfaceScheme),
		fontStack: `var(${font.cssVar}), "${font.label}", ${font.generic}`,
		brandNameColor: normalizeBrandNameColor(theme.brandNameColor),
	};
}

/** Pares [variable, valor] que se aplican al nodo del tema; el color vacío se omite. */
export function tenantSurfaceCssVarEntries(theme: Partial<StoreThemeConfig>): Array<[string, string]> {
	const vars = resolveTenantSurfaceVars(theme);
	const entries: Array<[string, string]> = [
		["--tenant-surface-scheme", vars.surfaceScheme],
		["--tenant-font", vars.fontStack],
	];
	if (vars.brandNameColor) entries.push(["--menu-brand-color", vars.brandNameColor]);
	return entries;
}

/** Bloque `<style>` del SSR, al lado del de colores. */
export function buildTenantSurfaceCssString(theme: Partial<StoreThemeConfig>): string {
	const body = tenantSurfaceCssVarEntries(theme)
		.map(([name, value]) => `${name}:${value};`)
		.join("");
	return `.tenant-theme-vars{${body}}`;
}

/** `data-scheme` con el que el SSR pinta el primer frame; "auto" lo resuelve el cliente. */
export function resolveTenantSurfaceSchemeAttr(theme: Partial<StoreThemeConfig>): "light" | "dark" | undefined {
	const scheme = normalizeSurfaceScheme(theme.surfaceScheme);
	return scheme === "auto" ? undefined : scheme;
}

/**
 * `data-scheme-mode`: "manual" cuando el local eligió claro u oscuro a mano.
 * El CSS lo usa para aclarar también el fondo de página en modo claro; con
 * "auto" el fondo es el que el local ya configuró y no se toca.
 */
export function resolveTenantSurfaceSchemeMode(theme: Partial<StoreThemeConfig>): "manual" | "auto" {
	return normalizeSurfaceScheme(theme.surfaceScheme) === "auto" ? "auto" : "manual";
}

/**
 * Vista previa: escribe las variables en el nodo del tema y devuelve cómo
 * deshacerlo. Cambiar el atributo `style` dispara al observador de
 * `useTenantSurfaceScheme`, así que el modo claro/oscuro se recalcula solo.
 */
export function applyTenantSurfaceCssVars(theme: Partial<StoreThemeConfig>, root?: HTMLElement | null): () => void {
	const target =
		root ?? (typeof document !== "undefined" ? (document.querySelector(".tenant-theme-vars") as HTMLElement | null) : null);
	if (!target) return () => {};

	const previous = TENANT_SURFACE_CSS_VARS.map((name) => [name, target.style.getPropertyValue(name)] as const);
	const next = new Map(tenantSurfaceCssVarEntries(theme));
	for (const name of TENANT_SURFACE_CSS_VARS) {
		const value = next.get(name);
		if (value) target.style.setProperty(name, value);
		else target.style.removeProperty(name);
	}

	return () => {
		for (const [name, value] of previous) {
			if (value) target.style.setProperty(name, value);
			else target.style.removeProperty(name);
		}
	};
}
