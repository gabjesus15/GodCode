/**
 * Formatea montos de dinero para el tenant.
 * Usa es-CL para asegurar puntos como separadores de miles y comas para decimales si aplica.
 * Por defecto no muestra decimales para CLP.
 */
export function formatCartMoney(amount: number, currency: string = "CLP"): string {
  const isUSD = currency === "USD";
  const locale = isUSD ? "en-US" : "es-CL";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: isUSD ? 2 : 0,
  }).format(Number(amount) || 0);
}
