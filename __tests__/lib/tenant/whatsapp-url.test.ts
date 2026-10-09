import { describe, expect, it } from "vitest";

import { whatsappUrlFromPhone } from "@/lib/tenant/whatsapp-url";

describe("whatsappUrlFromPhone", () => {
	it.each(["Venezuela", "venezuela", "VE", " ve ", "República Bolivariana de Venezuela"])(
		"completa el 58 con el país guardado como %j",
		(country) => {
			expect(whatsappUrlFromPhone("0412 123 4567", country)).toBe("https://wa.me/584121234567");
		},
	);

	it.each(["Chile", "chile", "CL", " cl "])("completa el 56 con el país guardado como %j", (country) => {
		expect(whatsappUrlFromPhone("9 1234 5678", country)).toBe("https://wa.me/56912345678");
	});

	it("con + no toca el número, y sin país no adivina el código", () => {
		expect(whatsappUrlFromPhone("+58 412 1234567", "Chile")).toBe("https://wa.me/584121234567");
		expect(whatsappUrlFromPhone("04121234567", null)).toBe("https://wa.me/04121234567");
		expect(whatsappUrlFromPhone("0412 1234567", "Colombia")).toBe("https://wa.me/04121234567");
	});

	it("descarta lo que no puede ser un número", () => {
		expect(whatsappUrlFromPhone("", "VE")).toBeNull();
		expect(whatsappUrlFromPhone("123", "VE")).toBeNull();
		expect(whatsappUrlFromPhone("1".repeat(16), null)).toBeNull();
	});
});
