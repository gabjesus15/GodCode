import { describe, expect, it } from "vitest";

import {
  isoFractionDigits,
  majorToMinor,
  minorToMajor,
  sumMinor,
} from "@/lib/money/minor-units";

describe("minor units", () => {
  it.each([
    ["CLP", 0],
    ["USD", 2],
    ["VES", 2],
    ["JPY", 0],
    ["KWD", 3],
  ])("obtiene la escala ISO de %s", (currency, expected) => {
    expect(isoFractionDigits(currency)).toBe(expected);
  });

  it("convierte sin errores binarios de punto flotante", () => {
    expect(majorToMinor("10.50", "USD")).toBe(1050);
    expect(majorToMinor("0.29", "USD")).toBe(29);
    expect(majorToMinor("12.345", "KWD")).toBe(12345);
    expect(majorToMinor("1490", "CLP")).toBe(1490);
  });

  it("redondea una sola vez a la unidad mínima", () => {
    expect(majorToMinor("10.505", "USD")).toBe(1051);
    expect(majorToMinor("10.504", "USD")).toBe(1050);
  });

  it("convierte de vuelta y suma únicamente enteros seguros", () => {
    expect(minorToMajor(1050, "USD")).toBe(10.5);
    expect(sumMinor([4500, 5990, 2000])).toBe(12490);
    expect(() => sumMinor([0.5])).toThrow(RangeError);
  });

  it("admite override por sucursal y rechaza códigos inválidos", () => {
    expect(isoFractionDigits("USD", 0)).toBe(0);
    expect(() => isoFractionDigits("US")).toThrow();
    expect(() => isoFractionDigits("USD", 7)).toThrow(RangeError);
  });
});
