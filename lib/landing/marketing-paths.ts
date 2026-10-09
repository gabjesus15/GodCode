/**
 * Las páginas públicas de marketing del dominio principal, en una sola lista: la home
 * del producto, la del estudio (/labs), «Sobre», la calculadora y las páginas de país.
 *
 * La usan la analítica (`lib/analytics/page-context`, que las cuenta como «landing») y
 * el «Volver» de las páginas legales (`lib/legal/legal-back-href`). No importa nada a
 * propósito: el rastreador de visitas va en todas las páginas, también en los menús de
 * los negocios, y no debe arrastrar el texto de las páginas de país.
 */

/** Slugs de las páginas de país. `lib/landing/countries.ts` tipa su registro con esta lista. */
export const LANDING_COUNTRY_SLUG_LIST = ["chile", "venezuela"] as const;

export const MAIN_DOMAIN_MARKETING_PATHS: readonly string[] = [
	"/",
	"/labs",
	"/sobre-godcode",
	"/calculadora-comisiones",
	...LANDING_COUNTRY_SLUG_LIST.map((slug) => `/${slug}`),
];

const MARKETING_PATH_SET = new Set(MAIN_DOMAIN_MARKETING_PATHS);

/** Ruta sin query ni barra final, en minúsculas: «/Chile/?x=1» → «/chile»; la raíz queda «/». */
export function normalizeMarketingPath(pathname: string): string {
	const path = (pathname.split(/[?#]/)[0] || "/").trim().toLowerCase();
	return path.replace(/\/+$/, "") || "/";
}

export function isMainDomainMarketingPath(pathname: string): boolean {
	return MARKETING_PATH_SET.has(normalizeMarketingPath(pathname));
}
