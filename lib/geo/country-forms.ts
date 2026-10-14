import { validateRutChile, formatRutOnInput } from "../../utils/chile-forms";
import { COUNTRY_REGISTRY, normalizeCountryCode } from "./country-registry";

/** Cómo se llama la división territorial que pide el formulario de entrega. */
export type AddressAreaKind = "commune" | "municipality" | "city" | "cityZip";

export interface CountryAddressVocabulary {
  areaKind: AddressAreaKind;
  /** Ejemplos reales del país para los placeholders (nombres propios, no se traducen). */
  areaExample: string;
  streetExample: string;
  numberExample: string;
}

export interface CountryFormStrategy {
  /**
   * Si el checkout pide documento. Chile, Venezuela y Colombia sí (RUT, cédula/RIF,
   * cédula); en el resto no hay un documento que el cliente de un restaurante espere
   * dar, y pedirlo bloquearía el pedido.
   */
  requiresId: boolean;
  idName: string; // RUT, DNI, RIF, etc. Vacío si requiresId es false.
  idPlaceholder: string;
  phonePlaceholder: string;
  phonePrefix: string;
  address: CountryAddressVocabulary;
  formatId?: (val: string) => string;
  validateId: (val: string) => boolean;
  validatePhone: (val: string) => boolean;
  normalizePhone: (val: string) => string;
}

export const COUNTRY_FORM_STRATEGIES: Record<string, CountryFormStrategy> = {
  CL: {
    requiresId: true,
    idName: "RUT",
    idPlaceholder: "12.345.678-9",
    phonePlaceholder: "+56 9 1234 5678",
    phonePrefix: "+56 9 ",
    address: {
      areaKind: "commune",
      areaExample: "Ñuñoa",
      streetExample: "Av. Vicuña Mackenna",
      numberExample: "1432",
    },
    formatId: formatRutOnInput,
    validateId: validateRutChile,
    validatePhone: (val: string) => {
      const clean = val.replace(/\D/g, "");
      return (clean.length === 11 && clean.startsWith("569")) || (clean.length === 9 && clean.startsWith("9"));
    },
    normalizePhone: (val: string) => {
      if (!val.startsWith("+56 9 ")) {
        if (val.length < 6) return "+56 9 ";
      }
      return val;
    },
  },
  VE: {
    requiresId: true,
    idName: "Cédula / RIF",
    idPlaceholder: "V-12345678",
    phonePlaceholder: "+58 412 123 4567",
    phonePrefix: "+58 ",
    address: {
      areaKind: "municipality",
      areaExample: "Chacao",
      streetExample: "Av. Francisco de Miranda",
      numberExample: "12",
    },
    formatId: (val: string) => {
      const clean = val.replace(/[^0-9vVjJeEgG]/g, "").toUpperCase();
      if (!clean) return "";
      if (!/^[VJEG]/.test(clean)) return "V-" + clean;
      if (clean.length === 1) return clean + "-";
      if (!clean.includes("-")) return clean[0] + "-" + clean.slice(1);
      return clean;
    },
    validateId: (val: string) => /^[VJEG]-[0-9]{7,9}$/i.test(val),
    validatePhone: (val: string) => {
      const clean = val.replace(/\D/g, "");
      return clean.length === 12 && clean.startsWith("58");
    },
    normalizePhone: (val: string) => {
      if (!val.startsWith("+58 ")) return "+58 " + val.replace(/^\+?58\s?/, "");
      return val;
    },
  },
  CO: {
    requiresId: true,
    idName: "Cédula",
    idPlaceholder: "1.234.567.890",
    phonePlaceholder: "+57 300 123 4567",
    phonePrefix: "+57 ",
    address: {
      areaKind: "city",
      areaExample: "Chapinero",
      streetExample: "Carrera 7",
      numberExample: "45-10",
    },
    validateId: (val: string) => val.replace(/\D/g, "").length >= 6,
    validatePhone: (val: string) => {
      const clean = val.replace(/\D/g, "");
      return clean.length === 12 && clean.startsWith("573");
    },
    normalizePhone: (val: string) => {
      if (!val.startsWith("+57 ")) return "+57 " + val.replace(/^\+?57\s?/, "");
      return val;
    },
  },
  US: {
    requiresId: false,
    idName: "",
    idPlaceholder: "",
    phonePlaceholder: "+1 305 555 0123",
    phonePrefix: "+1 ",
    address: {
      areaKind: "cityZip",
      areaExample: "Doral, FL 33166",
      streetExample: "NW 41st St",
      numberExample: "8300",
    },
    validateId: () => true,
    // +1 y 10 dígitos (código de área de 3 + número de 7).
    validatePhone: (val: string) => {
      const clean = val.replace(/\D/g, "");
      return clean.length === 11 && clean.startsWith("1");
    },
    normalizePhone: (val: string) => {
      if (!val.startsWith("+1 ")) return "+1 " + val.replace(/^\+?1\s?/, "");
      return val;
    },
  },
};

/**
 * Reglas para un país conocido sin reglas propias (México, Perú, España…): sin
 * documento y con el prefijo telefónico del país. Antes caían en las de Chile y el
 * cliente no podía pedir sin un RUT y un +56.
 */
export function buildGenericFormStrategy(phonePrefix: string): CountryFormStrategy {
  const digits = phonePrefix.replace(/\D/g, "");
  const prefix = `+${digits} `;
  return {
    requiresId: false,
    idName: "",
    idPlaceholder: "",
    phonePlaceholder: `${prefix}...`,
    phonePrefix: prefix,
    address: { areaKind: "city", areaExample: "Centro", streetExample: "Av. Principal", numberExample: "123" },
    validateId: () => true,
    // E.164: hasta 15 dígitos en total; al menos 7 después del prefijo.
    validatePhone: (val: string) => {
      const clean = val.replace(/\D/g, "");
      return clean.startsWith(digits) && clean.length >= digits.length + 7 && clean.length <= 15;
    },
    normalizePhone: (val: string) => {
      if (!val.startsWith(prefix)) return prefix + val.replace(new RegExp(`^\\+?${digits}\\s?`), "");
      return val;
    },
  };
}

export function getFormStrategy(countryCode: string | null | undefined): CountryFormStrategy {
  // Sin país conocido se mantiene Chile, como siempre: es el valor por defecto de los negocios.
  const code = normalizeCountryCode(countryCode) ?? "CL";
  const own = COUNTRY_FORM_STRATEGIES[code];
  if (own) return own;
  const registry = COUNTRY_REGISTRY[code];
  return registry ? buildGenericFormStrategy(registry.phonePrefix) : COUNTRY_FORM_STRATEGIES.CL;
}

/** País del checkout según sucursal, negocio o carrito (sin inferir por método de pago). */
export function resolveCheckoutCountryCode(params: {
  branchCountry?: string | null;
  businessCountry?: string | null;
  cartCountry?: string | null;
}): string {
  return (
    normalizeCountryCode(params.branchCountry) ??
    normalizeCountryCode(params.businessCountry) ??
    normalizeCountryCode(params.cartCountry) ??
    "CL"
  );
}
