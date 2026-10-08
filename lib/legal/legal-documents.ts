/**
 * Versión vigente de los documentos legales (términos, privacidad, cookies y
 * términos de la cuenta del menú). Si cambia cualquiera de los textos, sube la
 * versión y la fecha: es lo que prueba qué texto aceptó cada cliente.
 */
export const LEGAL_DOCUMENTS_VERSION = "2026-10-08";
export const LEGAL_UPDATED_AT_LABEL = "8 de octubre de 2026";

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
