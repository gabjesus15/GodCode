import { isMainDomainMarketingPath } from "@/lib/landing/marketing-paths";

import { LEGAL_COOKIES_PATH, LEGAL_PRIVACY_PATH, LEGAL_TERMS_PATH } from "./legal-documents";

/** Desde una página legal, «Volver» nunca lleva a otra página legal. */
const LEGAL_PATHS = new Set([LEGAL_TERMS_PATH, LEGAL_PRIVACY_PATH, LEGAL_COOKIES_PATH]);

/**
 * A dónde lleva «Volver» en una página legal, según el `referer`:
 * - a la pantalla del alta de la que venía la persona (paso 1, tienda armada, pago…),
 *   con su query, porque el pago y la tienda la necesitan (`?token=…`);
 * - a la página de marketing de la que venía (home, /labs, /chile…), según la lista
 *   única de `lib/landing/marketing-paths`;
 * - a la home en cualquier otro caso: sin `referer`, desde otro sitio o desde otra
 *   página legal.
 * Devuelve siempre una ruta relativa: del `referer` solo se usan la ruta y la query,
 * nunca el origen, así que no puede sacar a nadie del sitio.
 */
export function resolveLegalBackHref(referer: string | null | undefined): string {
	if (!referer) return "/";
	try {
		const url = new URL(referer, "https://localhost");
		const path = url.pathname.replace(/\/+$/, "") || "/";
		if (LEGAL_PATHS.has(path)) return "/";
		if (/^\/onboarding(\/|$)/.test(path) || isMainDomainMarketingPath(path)) return `${path}${url.search}`;
	} catch {
		// `referer` malformado: a la home.
	}
	return "/";
}
