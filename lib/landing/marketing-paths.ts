/**
 * Las páginas públicas de marketing del dominio principal, en una sola lista: la home
 * del producto, la del estudio (/labs), «Sobre», la calculadora, las páginas de país, la guía
 * de comisiones y las páginas por tipo de negocio.
 *
 * La usan la analítica (`lib/analytics/page-context`, que las cuenta como «landing») y
 * el «Volver» de las páginas legales (`lib/legal/legal-back-href`). No importa nada a
 * propósito: el rastreador de visitas va en todas las páginas, también en los menús de
 * los negocios, y no debe arrastrar el texto de las páginas de país.
 */

/** Slugs de las páginas de país. `lib/landing/countries.ts` tipa su registro con esta lista. */
export const LANDING_COUNTRY_SLUG_LIST = ["chile", "venezuela"] as const;

/** Slugs de las páginas por tipo de negocio (/menu-digital/{slug}); `business-types.ts` tipa su registro con esta lista. */
export const LANDING_BUSINESS_TYPE_SLUG_LIST = [
	"pizzerias",
	"sushi",
	"hamburgueserias",
	"comida-rapida",
	"restaurantes",
	"cafeterias",
	"panaderias",
] as const;

/** Slugs de las páginas por función (/funciones/{slug}); `features.ts` tipa su registro con esta lista. */
export const LANDING_FEATURE_SLUG_LIST = ["punto-de-venta", "menu-qr", "pedidos-online", "delivery-propio", "inventario"] as const;

/** Índice de las funciones. */
export const LANDING_FEATURES_PATH = "/funciones";

/** Índice de los tipos de negocio. */
export const LANDING_BUSINESS_TYPES_PATH = "/menu-digital";

/** Guía de comisiones de las apps de delivery en Chile (con fuentes). */
export const LANDING_COMMISSIONS_GUIDE_PATH = "/comisiones-delivery-chile";

export const MAIN_DOMAIN_MARKETING_PATHS: readonly string[] = [
	"/",
	"/labs",
	"/sobre-godcode",
	"/calculadora-comisiones",
	...LANDING_COUNTRY_SLUG_LIST.map((slug) => `/${slug}`),
	LANDING_COMMISSIONS_GUIDE_PATH,
	LANDING_BUSINESS_TYPES_PATH,
	...LANDING_BUSINESS_TYPE_SLUG_LIST.map((slug) => `${LANDING_BUSINESS_TYPES_PATH}/${slug}`),
	LANDING_FEATURES_PATH,
	...LANDING_FEATURE_SLUG_LIST.map((slug) => `${LANDING_FEATURES_PATH}/${slug}`),
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
