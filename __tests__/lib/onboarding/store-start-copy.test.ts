import { describe, expect, it } from "vitest";

import { getStoreStartCopy } from "@/lib/onboarding/store-start-copy";

const LOCALES = ["es", "en", "pt", "fr", "de", "it"] as const;

describe("textos de «Crear mi tienda»", () => {
	it("los seis idiomas tienen los mismos textos y ninguno vacío", () => {
		const reference = Object.keys(getStoreStartCopy("es")).sort();
		for (const locale of LOCALES) {
			const copy = getStoreStartCopy(locale);
			expect(Object.keys(copy).sort(), locale).toEqual(reference);
			for (const value of Object.values(copy).flat()) expect(String(value).trim(), locale).not.toBe("");
		}
	});

	it("con «solo panel CEO» ya pagado, el aviso habla de la cuenta y del panel, no de una tienda", () => {
		const es = getStoreStartCopy("es");
		expect(es.panelOnlyCreatedTitle).toBe("Tu cuenta ya está creada");
		for (const locale of LOCALES) {
			const copy = getStoreStartCopy(locale);
			const text = `${copy.panelOnlyCreatedTitle} ${copy.panelOnlyCreatedBody}`.toLowerCase();
			expect(text, locale).not.toMatch(/tienda|store|loja|boutique|shop|negozio|menú|menu|cardápio|speisekarte/);
			expect(text, locale).toContain("ceo");
			expect(copy.panelOnlyCreatedTitle, locale).not.toBe(copy.createdTitle);
		}
	});

	it("en español no hay exclamaciones ni rayas", () => {
		for (const value of Object.values(getStoreStartCopy("es")).flat()) expect(String(value)).not.toMatch(/¡|—|–/);
	});
});
