/**
 * Formatea montos de dinero para el tenant de forma dinámica.
 * Soporta CLP (separadores de miles con punto, sin decimales),
 * USD (en-US, con decimales), VES (bolívares, con decimales) y otras monedas comunes.
 */
export function formatCartMoney(amount: number, currency: string = "CLP"): string {
  const c = currency.toUpperCase();
  
  let locale = "es-CL";
  let fractionDigits = 0;

  if (c === "USD") {
    locale = "en-US";
    fractionDigits = 2;
  } else if (c === "VES") {
    locale = "es-VE";
    fractionDigits = 2;
  } else if (c === "COP") {
    locale = "es-CO";
    fractionDigits = 0;
  } else if (c === "MXN") {
    locale = "es-MX";
    fractionDigits = 2;
  } else if (c === "ARS") {
    locale = "es-AR";
    fractionDigits = 0;
  } else if (c === "PEN") {
    locale = "es-PE";
    fractionDigits = 2;
  } else if (c === "BRL") {
    locale = "pt-BR";
    fractionDigits = 2;
  } else if (c === "EUR") {
    locale = "de-DE";
    fractionDigits = 2;
  }

  const numFormatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(amount) || 0);

  if (c === "USD") {
    return `$${numFormatted}`;
  }
  if (c === "VES") {
    return `Bs. ${numFormatted}`;
  }
  if (c === "CLP") {
    return `CLP ${numFormatted}`;
  }
  if (c === "COP") {
    return `COP ${numFormatted}`;
  }
  if (c === "MXN") {
    return `MXN ${numFormatted}`;
  }
  if (c === "ARS") {
    return `ARS ${numFormatted}`;
  }
  if (c === "PEN") {
    return `S/ ${numFormatted}`;
  }
  if (c === "BRL") {
    return `R$ ${numFormatted}`;
  }
  if (c === "EUR") {
    return `€${numFormatted}`;
  }

  return `${c} ${numFormatted}`;
}
