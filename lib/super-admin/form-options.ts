import { SUBSCRIPTION_STATUSES } from "@/lib/status/status-labels";

export const COUNTRY_OPTIONS = [
  { value: "CL", label: "Chile" },
  { value: "VE", label: "Venezuela" },
  { value: "US", label: "Estados Unidos" },
  { value: "MX", label: "México" },
  { value: "CO", label: "Colombia" },
  { value: "AR", label: "Argentina" },
  { value: "PE", label: "Perú" },
  { value: "EC", label: "Ecuador" },
  { value: "BR", label: "Brasil" },
  { value: "ES", label: "España" },
  { value: "PA", label: "Panamá" },
  { value: "OTRO", label: "Otro" },
];

export const CURRENCY_OPTIONS = [
  { value: "CLP", label: "Peso chileno (CLP)" },
  { value: "VES", label: "Bolívar (VES)" },
  { value: "USD", label: "Dólar estadounidense (USD)" },
  { value: "MXN", label: "Peso mexicano (MXN)" },
  { value: "COP", label: "Peso colombiano (COP)" },
  { value: "ARS", label: "Peso argentino (ARS)" },
  { value: "PEN", label: "Sol peruano (PEN)" },
  { value: "BRL", label: "Real brasileño (BRL)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "OTRO", label: "Otro" },
];

/** Los estados que admite la base (CHECK de companies), con los nombres del mapa común. */
export const SUBSCRIPTION_STATUS_OPTIONS = (["active", "trial", "payment_pending", "cancelled", "suspended"] as const).map((value) => ({
  value,
  label: SUBSCRIPTION_STATUSES[value].label,
}));
