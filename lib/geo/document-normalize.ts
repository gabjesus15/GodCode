/**
 * Normalización y validación del número de documento usado como identificador de
 * login del cliente final del menú.
 *
 * Isomorfo a propósito: el servidor lo usa para calcular el valor canónico que se
 * guarda (nunca acepta un normalizado que venga del cliente), y la UI lo usa solo
 * para dar feedback mientras se escribe.
 */

import { validateRutChile } from "../../utils/chile-forms";
import { normalizeCountryCode } from "./country-registry";

export type DocumentNormalizeFailure =
  | "empty"
  | "invalid_format"
  | "blocked"
  | "too_short"
  | "too_long";

export type DocumentNormalizeResult =
  | { ok: true; normalized: string; country: string }
  | { ok: false; reason: DocumentNormalizeFailure };

/** Límites que espejan el CHECK `menu_client_accounts_document_len`. */
export const DOCUMENT_MIN_LENGTH = 5;
export const DOCUMENT_MAX_LENGTH = 32;

/**
 * Valores basura heredados del POS, donde el documento se tecleaba a mano o se
 * dejaba un genérico. En `clients` hay 346 filas con "19" y varias con "SINRUT".
 * Se bloquean para que esa basura no entre en la tabla de cuentas.
 */
export const BLOCKED_DOCUMENTS: ReadonlySet<string> = new Set([
  "SINRUT",
  "SINRUC",
  "SINCEDULA",
  "NOTIENE",
  "GENERICO",
  "11111111",
  "12345678",
  "123456789",
  "1234567890",
  "99999999",
  "00000000",
]);

/** Solo caracteres significativos, en mayúsculas. */
function stripSeparators(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
}

/** Quita ceros a la izquierda sin llegar a vaciar el valor. */
function stripLeadingZeros(value: string): string {
  const trimmed = value.replace(/^0+/, "");
  return trimmed.length > 0 ? trimmed : value;
}

/** Un solo carácter repetido ("000000", "1111"). */
function isSingleRepeatedChar(value: string): boolean {
  return value.length > 0 && /^(.)\1*$/.test(value);
}

function isBlocked(normalized: string): boolean {
  // Solo listas explícitas y repeticiones de un carácter. Nada de heurísticas de
  // "secuencia ascendente": documentos reales caen dentro de ese patrón por azar.
  return BLOCKED_DOCUMENTS.has(normalized) || isSingleRepeatedChar(normalized);
}

function withLengthGuard(normalized: string, country: string): DocumentNormalizeResult {
  if (normalized.length < DOCUMENT_MIN_LENGTH) return { ok: false, reason: "too_short" };
  if (normalized.length > DOCUMENT_MAX_LENGTH) return { ok: false, reason: "too_long" };
  if (isBlocked(normalized)) return { ok: false, reason: "blocked" };
  return { ok: true, normalized, country };
}

/**
 * Devuelve el documento canónico para `(company, documento)`.
 *
 * Las reglas por país son las mismas que usa el checkout en `country-forms.ts`,
 * pero aquí el resultado es el valor que se persiste, así que se normaliza además
 * la puntuación y los ceros a la izquierda.
 */
export function normalizeDocument(
  raw: string | null | undefined,
  countryCode: string | null | undefined,
): DocumentNormalizeResult {
  const country = normalizeCountryCode(countryCode) ?? "CL";
  const cleaned = stripSeparators(String(raw ?? ""));

  if (!cleaned) return { ok: false, reason: "empty" };

  if (country === "CL") {
    // El RUT trae dígito verificador: se valida con módulo 11 sobre el valor crudo.
    if (!validateRutChile(cleaned)) return { ok: false, reason: "invalid_format" };
    const body = stripLeadingZeros(cleaned.slice(0, -1));
    const verifier = cleaned.slice(-1);
    return withLengthGuard(`${body}${verifier}`, country);
  }

  if (country === "VE") {
    if (!/^[VJEG][0-9]{7,9}$/.test(cleaned)) return { ok: false, reason: "invalid_format" };
    const prefix = cleaned.slice(0, 1);
    const digits = stripLeadingZeros(cleaned.slice(1));
    return withLengthGuard(`${prefix}${digits}`, country);
  }

  if (country === "CO") {
    if (!/^[0-9]+$/.test(cleaned)) return { ok: false, reason: "invalid_format" };
    return withLengthGuard(stripLeadingZeros(cleaned), country);
  }

  // Países sin estrategia propia: solo alfanumérico y longitud.
  if (!/^[0-9A-Z]+$/.test(cleaned)) return { ok: false, reason: "invalid_format" };
  return withLengthGuard(stripLeadingZeros(cleaned), country);
}

/**
 * Enmascara el documento para mostrarlo en "Mi cuenta" sin exponerlo entero.
 * Conserva los dos primeros y el último carácter: `12345678K` → `12······K`.
 */
export function maskDocument(normalized: string | null | undefined): string {
  const value = String(normalized ?? "");
  if (value.length <= 3) return value;
  const head = value.slice(0, 2);
  const tail = value.slice(-1);
  return `${head}${"·".repeat(value.length - 3)}${tail}`;
}
