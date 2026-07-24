const MAX_FRACTION_DIGITS = 6;

function assertSafeMinor(value: number): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError("El monto excede el rango contable admitido.");
  }
  return value;
}

/** Coerce number | string | bigint without Math.* on raw bigint (throws in JS). */
function toFiniteNumber(value: unknown): number {
  if (typeof value === "bigint") {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new TypeError("Monto inválido.");
    return n;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError("Monto inválido.");
  return n;
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
  value: string | number | bigint,
  currency: string,
  fractionDigits?: number | null,
): number {
  const numeric = toFiniteNumber(value);
  return canonicalDecimalToMinor(String(numeric), isoFractionDigits(currency, fractionDigits));
}

export function minorToMajor(
  value: number | bigint,
  currency: string,
  fractionDigits?: number | null,
): number {
  const digits = isoFractionDigits(currency, fractionDigits);
  return assertSafeMinor(toFiniteNumber(value)) / (10 ** digits);
}

export function sumMinor(values: Array<number | bigint>): number {
  const total = values.reduce<number>(
    (sum, value) => sum + assertSafeMinor(toFiniteNumber(value)),
    0,
  );
  return assertSafeMinor(total);
}
