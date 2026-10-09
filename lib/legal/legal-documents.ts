/**
 * Versión vigente de los documentos legales (términos, privacidad, cookies y
 * términos de la cuenta del menú), en formato AAAA-MM-DD, y la fecha que muestran
 * las páginas. Si cambia cualquiera de los textos, sube las dos.
 *
 * Es la prueba de qué texto aceptó cada cliente, y por eso la usan dos piezas del
 * alta, tal como prometen los Términos (sección 2) y la Política de privacidad
 * (sección 3):
 * - El paso 1 la manda con la solicitud y el servicio del alta la guarda en
 *   `onboarding_applications.legal_version`, junto con la fecha, la IP y el navegador.
 * - El correo de confirmación del primer pago enlaza a los Términos con
 *   `getAppUrl() + LEGAL_TERMS_PATH`.
 * Las solicitudes guardadas antes de existir `legal_version` quedan en null.
 */
export const LEGAL_DOCUMENTS_VERSION = "2026-10-09";
export const LEGAL_UPDATED_AT_LABEL = "9 de octubre de 2026";

/** Rutas de los documentos, para enlazarlos desde el alta y los correos sin escribirlas a mano. */
export const LEGAL_TERMS_PATH = "/onboarding/terminos";
export const LEGAL_PRIVACY_PATH = "/onboarding/privacidad";
export const LEGAL_COOKIES_PATH = "/onboarding/cookies";

/**
 * En qué moneda se cobra el plan. Los Términos (sección 5) y la página de Chile
 * (`lib/landing/countries.ts`) usan estas mismas frases: si cambia cómo se cobra,
 * se cambia aquí y sube la versión.
 *
 * Mercado Pago (solo Chile) cobra en pesos con la tasa USD→CLP que se fija en el
 * súper admin (Métodos de cobro → Mercado Pago), no con una tasa del día; por eso el
 * texto promete el monto exacto antes de pagar y no un tipo de cambio concreto.
 */
export const LEGAL_PRICES_IN_USD = "Los precios se muestran en dólares estadounidenses (USD).";
export const LEGAL_MERCADO_PAGO_CLP =
	"Si pagas con Mercado Pago, te cobramos el equivalente en pesos chilenos y ves el monto exacto antes de pagar.";
export const LEGAL_OTHER_CURRENCY = "Si pagas en otra moneda, el tipo de cambio es el de tu banco o de la pasarela de pago.";

/**
 * RUT y domicilio del titular de Gcode. El Reglamento de Comercio Electrónico
 * (DS 6/2021) pide publicarlos; se configuran por entorno para no fijarlos en el
 * código. Vacíos, las páginas simplemente no los muestran.
 */
export const LEGAL_PROVIDER_RUT = process.env.NEXT_PUBLIC_LEGAL_PROVIDER_RUT?.trim() || "";
export const LEGAL_PROVIDER_ADDRESS = process.env.NEXT_PUBLIC_LEGAL_PROVIDER_ADDRESS?.trim() || "";

/** Clave del almacenamiento local donde se guarda la elección sobre Google Analytics. */
export const ANALYTICS_CONSENT_STORAGE_KEY = "gcode-consent-analytics";
/** La elección se vuelve a preguntar pasado este plazo. */
export const ANALYTICS_CONSENT_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
/** Evento de ventana que reabre el aviso de cookies (enlace «Cookies» del pie). */
export const OPEN_COOKIE_SETTINGS_EVENT = "gcode:open-cookie-settings";
