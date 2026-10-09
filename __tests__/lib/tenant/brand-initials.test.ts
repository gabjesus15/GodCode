import { describe, expect, it } from "vitest";

import { brandInitials } from "@/lib/tenant/brand-initials";

describe("brandInitials", () => {
	it("una letra por cada una de las dos primeras palabras con peso", () => {
		expect(brandInitials("Rica Pizza")).toBe("RP");
		expect(brandInitials("  rica   pizza  ")).toBe("RP");
		expect(brandInitials("Oishi Sushi Delivery")).toBe("OS");
	});

	it("una sola palabra da una sola letra", () => {
		expect(brandInitials("Gcode")).toBe("G");
		expect(brandInitials("Americano")).toBe("A");
	});

	it("descarta artículos, preposiciones y conjunciones cortas", () => {
		expect(brandInitials("La Pizza")).toBe("P");
		expect(brandInitials("El Rincón del Sabor")).toBe("RS");
		expect(brandInitials("Pizzería de Juan")).toBe("PJ");
		expect(brandInitials("Pan y Café")).toBe("PC");
		expect(brandInitials("The Burger House")).toBe("BH");
		expect(brandInitials("Casa da Praia")).toBe("CP");
	});

	it("si todas las palabras son artículos, las usa igual", () => {
		expect(brandInitials("La La")).toBe("LL");
		expect(brandInitials("De")).toBe("D");
	});

	it("ignora signos sueltos y comillas, y respeta tildes, eñes y cifras", () => {
		expect(brandInitials("Fish & Chips")).toBe("FC");
		expect(brandInitials("\"Ñoquis\" (Ópera)")).toBe("ÑÓ");
		expect(brandInitials("24 Horas")).toBe("2H");
		expect(brandInitials("- -")).toBe("");
	});

	it("respeta max y fallback", () => {
		expect(brandInitials("Pollo crispy", { max: 1 })).toBe("P");
		expect(brandInitials("Café con leche", { max: 1 })).toBe("C");
		expect(brandInitials("Rica Pizza", { max: 0 })).toBe("R");
		expect(brandInitials("", { fallback: "G" })).toBe("G");
		expect(brandInitials(null, { fallback: "GC" })).toBe("GC");
		expect(brandInitials(undefined)).toBe("");
		expect(brandInitials("&", { fallback: "?" })).toBe("?");
	});
});
