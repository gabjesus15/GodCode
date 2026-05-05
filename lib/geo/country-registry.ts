export type Continent = "USA/Canada" | "Latinoamérica" | "Europe" | "Asia" | "Africa" | "Oceania";

export interface CountryConfig {
  code: string;
  name: string;
  continent: Continent;
  currency: string;
  locale: string;
  timezone: string;
  phonePrefix: string;
}

export const COUNTRY_REGISTRY: Record<string, CountryConfig> = {
  CL: { code: "CL", name: "Chile", continent: "Latinoamérica", currency: "CLP", locale: "es-CL", timezone: "America/Santiago", phonePrefix: "+56" },
  VE: { code: "VE", name: "Venezuela", continent: "Latinoamérica", currency: "USD", locale: "es-VE", timezone: "America/Caracas", phonePrefix: "+58" },
  CO: { code: "CO", name: "Colombia", continent: "Latinoamérica", currency: "COP", locale: "es-CO", timezone: "America/Bogota", phonePrefix: "+57" },
  AR: { code: "AR", name: "Argentina", continent: "Latinoamérica", currency: "ARS", locale: "es-AR", timezone: "America/Argentina/Buenos_Aires", phonePrefix: "+54" },
  MX: { code: "MX", name: "México", continent: "Latinoamérica", currency: "MXN", locale: "es-MX", timezone: "America/Mexico_City", phonePrefix: "+52" },
  PE: { code: "PE", name: "Perú", continent: "Latinoamérica", currency: "PEN", locale: "es-PE", timezone: "America/Lima", phonePrefix: "+51" },
  EC: { code: "EC", name: "Ecuador", continent: "Latinoamérica", currency: "USD", locale: "es-EC", timezone: "America/Guayaquil", phonePrefix: "+593" },
  US: { code: "US", name: "United States", continent: "USA/Canada", currency: "USD", locale: "en-US", timezone: "America/New_York", phonePrefix: "+1" },
  CA: { code: "CA", name: "Canada", continent: "USA/Canada", currency: "CAD", locale: "en-CA", timezone: "America/Toronto", phonePrefix: "+1" },
  ES: { code: "ES", name: "España", continent: "Europe", currency: "EUR", locale: "es-ES", timezone: "Europe/Madrid", phonePrefix: "+34" },
  BR: { code: "BR", name: "Brasil", continent: "Latinoamérica", currency: "BRL", locale: "pt-BR", timezone: "America/Sao_Paulo", phonePrefix: "+55" },
};

const COUNTRY_ALIASES: Record<string, string> = {
  chile: "CL",
  venezuela: "VE",
  colombia: "CO",
  argentina: "AR",
  mexico: "MX",
  méxico: "MX",
  peru: "PE",
  perú: "PE",
  ecuador: "EC",
  usa: "US",
  "u.s.a": "US",
  "united states": "US",
  estadosunidos: "US",
  estadosunidosdeamerica: "US",
  canada: "CA",
  canadá: "CA",
  españa: "ES",
  spain: "ES",
  brasil: "BR",
  brazil: "BR",
};

export function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim().toUpperCase();
  if (COUNTRY_REGISTRY[raw]) return raw;
  
  const token = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.\s]/g, "")
    .replace(/\s+/g, "");

  return COUNTRY_ALIASES[token] ?? null;
}

export function getCountryConfig(value: string | null | undefined): CountryConfig | null {
  const code = normalizeCountryCode(value);
  if (!code) return null;
  return COUNTRY_REGISTRY[code] ?? null;
}
