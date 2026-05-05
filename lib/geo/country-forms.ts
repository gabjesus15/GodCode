import { validateRutChile, formatRutOnInput } from "../../utils/chile-forms";

export interface CountryFormStrategy {
  idName: string; // RUT, DNI, RIF, etc.
  idPlaceholder: string;
  phonePlaceholder: string;
  phonePrefix: string;
  formatId?: (val: string) => string;
  validateId: (val: string) => boolean;
  validatePhone: (val: string) => boolean;
  normalizePhone: (val: string) => string;
}

export const COUNTRY_FORM_STRATEGIES: Record<string, CountryFormStrategy> = {
  CL: {
    idName: "RUT",
    idPlaceholder: "12.345.678-9",
    phonePlaceholder: "+56 9 1234 5678",
    phonePrefix: "+56 9 ",
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
    idName: "Cédula / RIF",
    idPlaceholder: "V-12345678",
    phonePlaceholder: "+58 412 123 4567",
    phonePrefix: "+58 ",
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
    idName: "Cédula",
    idPlaceholder: "1.234.567.890",
    phonePlaceholder: "+57 300 123 4567",
    phonePrefix: "+57 ",
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
};

export function getFormStrategy(countryCode: string | null | undefined): CountryFormStrategy {
  const code = countryCode?.toUpperCase() || "CL";
  return COUNTRY_FORM_STRATEGIES[code] || COUNTRY_FORM_STRATEGIES["CL"];
}
