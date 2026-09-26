/**
 * Detección del país del usuario desde headers de Vercel.
 * Vercel proporciona automáticamente x-vercel-ip-country en producción.
 */

import { Continent, normalizeCountryCode } from "./country-registry";

export type CountryCode = "CL" | "VE" | "US" | "MX" | "AR" | "CA" | "CO" | "PE" | "EC" | "ES" | "BR" | "OTHER";
export type { Continent };

export function getCountryFromHeaders(headers: Headers): CountryCode {
  const country = headers.get("x-vercel-ip-country")?.toUpperCase() || "OTHER";
  const normalized = normalizeCountryCode(country);
  return (normalized as CountryCode) || "OTHER";
}
