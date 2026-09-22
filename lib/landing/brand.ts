/**
 * Fuente única de marca para marketing público (landing, OG, JSON-LD, llms.txt).
 *
 * Jerarquía:
 * - `LANDING_COMPANY_NAME`: la empresa (Organization en JSON-LD, og:site_name,
 *   plantilla de títulos, pie de página, términos). Es el nombre que queremos
 *   que Google muestre como "nombre del sitio".
 * - `LANDING_PRODUCT_NAME`: el producto SaaS que vive en este dominio
 *   (SoftwareApplication en JSON-LD, títulos de páginas de producto).
 * - `LANDING_BRAND_NAME`: forma corta para UI (navbar, badge "Hecho con").
 * - `LANDING_BRAND_ALTERNATE`: nombre anterior. Se mantiene como `alternateName`
 *   y en texto visible para que las búsquedas por "godcode" sigan encontrándonos.
 */

/** Empresa: estudio de desarrollo web con productos propios. */
export const LANDING_COMPANY_NAME = "Gcode Labs";

/** Producto SaaS de este dominio: menú digital, pedidos online y POS. */
export const LANDING_PRODUCT_NAME = "Gcode POS";

/** Forma corta de la marca para UI. */
export const LANDING_BRAND_NAME = "Gcode";

/** Nombre histórico / legal anterior. */
export const LANDING_BRAND_ALTERNATE = "GodCode";

/** Variantes con las que la gente busca la marca (alternateName en JSON-LD). */
export const LANDING_BRAND_ALTERNATE_NAMES = [
	LANDING_BRAND_NAME,
	LANDING_PRODUCT_NAME,
	LANDING_BRAND_ALTERNATE,
	"God Code",
	"G code labs",
] as const;

/** Descripción corta de la empresa para Organization / AboutPage. */
export const LANDING_COMPANY_DESCRIPTION =
	`${LANDING_COMPANY_NAME} es un estudio de desarrollo web con base en Santiago, Chile. Crea páginas web y sistemas a medida para negocios, y desarrolla productos propios de uso masivo como ${LANDING_PRODUCT_NAME}: menú digital, pedidos online y punto de venta sin comisiones. Antes conocido como ${LANDING_BRAND_ALTERNATE}.`;

/** Ubicación declarada de la empresa (Organization.address). */
export const LANDING_COMPANY_ADDRESS = {
	addressLocality: "Santiago",
	addressCountry: "CL",
} as const;

export const LANDING_SUPPORT_EMAIL =
	process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "godcode.administrativo@gmail.com";
