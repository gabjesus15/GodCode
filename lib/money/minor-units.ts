const MAX_FRACTION_DIGITS = 6;

function assertSafeMinor(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("El monto excede el rango contable admitido.");
  }
  return value;
}

export function isoFractionDigits(currency: string, override?: number | null): number {
  if (override != null && Number.isInteger(Number(override))) {
    const digits = Number(override);
    if (digits < 0 || digits > MAX_FRACTION_DIGITS) {
      throw new RangeError("currencyFractionDigits debe estar entre 0 y 6.");
    }
    return digits;
  }
  const code = String(currency ?? "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) throw new Error("Código de moneda ISO inválido.");
  return new Intl.NumberFormat("en", { style: "currency", currency: code })
    .resolvedOptions().maximumFractionDigits ?? 2;
}

function canonicalDecimalToMinor(value: string | number, fractionDigits: number): number {
  const match = String(value).trim().match(/^([+-])?(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
  if (!match) throw new TypeError("Monto inválido.");
  const [, sign = "", whole, fraction = "", exponentRaw = "0"] = match;
  const coefficient = BigInt(`${whole}${fraction}` || "0");
  const exponent = Number(exponentRaw) - fraction.length + fractionDigits;
  let absoluteMinor: bigint;
  if (exponent >= 0) {
    absoluteMinor = coefficient * (BigInt(10) ** BigInt(exponent));
  } else {
    const divisor = BigInt(10) ** BigInt(-exponent);
    absoluteMinor = (coefficient + divisor / BigInt(2)) / divisor;
  }
  return assertSafeMinor(Number(sign === "-" ? -absoluteMinor : absoluteMinor));
}

export function majorToMinor(
  value: string | number,
  currency: string,
  fractionDigits?: number | null,
): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new TypeError("Monto inválido.");
  return canonicalDecimalToMinor(String(value), isoFractionDigits(currency, fractionDigits));
}

export function minorToMajor(
  value: number,
  currency: string,
  fractionDigits?: number | null,
): number {
  const digits = isoFractionDigits(currency, fractionDigits);
  return assertSafeMinor(Number(value)) / (10 ** digits);
}

export function sumMinor(values: number[]): number {
  return assertSafeMinor(values.reduce(
    (sum, value) => sum + assertSafeMinor(Number(value)),
    0,
  ));
}
