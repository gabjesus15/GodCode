import { describe, expect, it } from "vitest";

import { resolveLocaleFromCountry } from "@/lib/i18n/tenant-locale";

describe("idioma del menú según el país del negocio", () => {
	it("el país guardado en español por el alta también da inglés", () => {
		expect(resolveLocaleFromCountry("Estados Unidos")).toBe("en");
		expect(resolveLocaleFromCountry("EE.UU.")).toBe("en");
		expect(resolveLocaleFromCountry("US")).toBe("en");
		expect(resolveLocaleFromCountry("united states")).toBe("en");
	});

	it("los países de habla hispana siguen en español", () => {
		expect(resolveLocaleFromCountry("Chile")).toBe("es");
		expect(resolveLocaleFromCountry("Venezuela")).toBe("es");
		expect(resolveLocaleFromCountry("México")).toBe("es");
	});
});
