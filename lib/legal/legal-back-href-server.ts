import "server-only";

import { headers } from "next/headers";

import { resolveLegalBackHref } from "./legal-back-href";

/**
 * El «Volver» de una página legal para esta petición, según su `referer`. Va aparte
 * de `components/legal/legal-page.tsx` porque ese archivo también lo importan
 * componentes de cliente (los términos de la cuenta del menú) y `next/headers` no
 * puede entrar en un paquete de cliente. Leer el `referer` vuelve dinámica la página,
 * lo que no importa: las páginas legales no se indexan.
 */
export async function getLegalBackHref(): Promise<string> {
	return resolveLegalBackHref((await headers()).get("referer"));
}
