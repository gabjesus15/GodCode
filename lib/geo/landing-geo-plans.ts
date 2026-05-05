/**
 * Detección de continente del usuario desde país de Vercel headers.
 * Vercel proporciona automáticamente x-vercel-ip-country en producción.
 */

import { Continent, getCountryConfig, normalizeCountryCode } from "./country-registry";

export type CountryCode = "CL" | "VE" | "US" | "MX" | "AR" | "CA" | "CO" | "PE" | "EC" | "ES" | "BR" | "OTHER";
export type { Continent };

export function getCountryFromHeaders(headers: Headers): CountryCode {
  const country = headers.get("x-vercel-ip-country")?.toUpperCase() || "OTHER";
  const normalized = normalizeCountryCode(country);
  return (normalized as CountryCode) || "OTHER";
}

/**
 * Mapear país a región (continente)
 */
export function getContinentFromCountry(country: CountryCode): Continent {
  if (country === "OTHER") return "Latinoamérica";
  const config = getCountryConfig(country);
  return config ? config.continent : "Latinoamérica";
}

/**
 * Moneda por región para mostrar en landing.
 */
export function getCurrencyByContinent(continent: Continent): {
  code: string;
  symbol: string;
  name: string;
} {
  const currencies: Record<Continent, { code: string; symbol: string; name: string }> = {
    "USA/Canada": { code: "USD", symbol: "$", name: "Dólar Estadounidense" },
    "Latinoamérica": { code: "USD", symbol: "$", name: "Dólar Estadounidense" },
    Europe: { code: "EUR", symbol: "€", name: "Euro" },
    Asia: { code: "SGD", symbol: "$", name: "Dólar Singapurense" },
    Africa: { code: "USD", symbol: "$", name: "Dólar Estadounidense" },
    Oceania: { code: "AUD", symbol: "$", name: "Dólar Australiano" },
  };

  return currencies[continent];
}

/**
 * Obtener lista de regiones disponibles
 */
export const CONTINENTS: { value: Continent; label: string }[] = [
  { value: "USA/Canada", label: "USA/Canada" },
  { value: "Latinoamérica", label: "Latinoamérica" },
  { value: "Europe", label: "Europa" },
  { value: "Asia", label: "Asia" },
  { value: "Africa", label: "Africa" },
  { value: "Oceania", label: "Oceanía" },
];
