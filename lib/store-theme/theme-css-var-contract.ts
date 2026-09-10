/**
 * Contrato de variables CSS del tema del tenant.
 *
 * **Este fichero es idéntico en los dos repositorios**, en:
 * - `saas-godcode-admin/lib/store-theme/theme-css-var-contract.ts`
 * - `Saas-Godcode-paneladmin-ceo/src/shared/utils/theme-css-var-contract.ts`
 *
 * Los dos repos emiten el mismo bloque de variables CSS desde código distinto:
 * el Portal en `lib/store-theme/apply-theme-css-vars.ts`, el Panel en
 * `src/shared/utils/panel-theme-css.ts`. Los componentes de ambos leen esos
 * mismos nombres. Renombrar un token en un repo no rompe el otro en el momento:
 * la variable simplemente deja de existir, `var(--lo-que-sea)` se queda vacío y
 * el color cae al valor heredado. El resultado es una UI descolorida en un solo
 * lado, sin ningún error.
 *
 * Esta lista es el amarre. Al tocar un nombre de token:
 * 1. Cámbialo aquí.
 * 2. Copia el fichero al otro repositorio. Comprueba con:
 *    `diff --strip-trailing-cr <ruta-portal> <ruta-panel>` (debe salir vacío).
 * 3. Los tests de contrato de cada repo dirán si la implementación se quedó atrás.
 */

/**
 * Tokens que **los dos** repos deben emitir. Un componente que use cualquiera de
 * estos funciona igual en el Panel y en el storefront del Portal.
 */
export const SHARED_THEME_CSS_VARS = [
	"--tenant-primary",
	"--accent-primary",
	"--accent-secondary",
	"--price-color",
	"--discount-color",
	"--accent-hover",
	"--accent-shadow",
	"--accent-shadow-strong",
	"--card-border",
	"--bg-primary",
	"--tenant-bg-image",
] as const;

/**
 * Tokens de la capa de fondo, **solo del Portal**.
 *
 * El storefront permite imagen de fondo con tint, opacidad y filtro; el Panel POS
 * no tiene esa capa, así que no los emite. La diferencia es deliberada: no la
 * "arregles" añadiéndolos al Panel sin que haya UI que los use.
 */
export const PORTAL_ONLY_THEME_CSS_VARS = [
	"--tenant-bg-layer-opacity",
	"--tenant-bg-size",
	"--tenant-bg-repeat",
	"--tenant-bg-layer-filter",
] as const;

export type SharedThemeCssVar = (typeof SHARED_THEME_CSS_VARS)[number];
export type PortalOnlyThemeCssVar = (typeof PORTAL_ONLY_THEME_CSS_VARS)[number];

/** Extrae los nombres `--token` declarados en un bloque CSS, en orden de aparición. */
export function extractCssVarNames(css: string): string[] {
	const names: string[] = [];
	const pattern = /(--[a-z0-9-]+)\s*:/gi;
	let match = pattern.exec(css);
	while (match !== null) {
		names.push(match[1]);
		match = pattern.exec(css);
	}
	return names;
}
