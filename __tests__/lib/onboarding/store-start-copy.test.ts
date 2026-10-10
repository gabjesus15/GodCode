import { describe, expect, it } from "vitest";

import { getStoreStartCopy, startStoreErrorMessage } from "@/lib/onboarding/store-start-copy";

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
		for (const value of Object.values(getStoreStartCopy("es").errors)) expect(value).not.toMatch(/¡|—|–/);
	});

	it("los rechazos por código existen en los seis idiomas y la contraseña lleva sus límites", () => {
		const reference = Object.keys(getStoreStartCopy("es").errors).sort();
		for (const locale of LOCALES) {
			const { errors } = getStoreStartCopy(locale);
			expect(Object.keys(errors).sort(), locale).toEqual(reference);
			for (const value of Object.values(errors)) expect(value.trim(), locale).not.toBe("");
			expect(errors.password, locale).toContain("{min}");
			expect(errors.password, locale).toContain("{max}");
		}
	});
});

describe("startStoreErrorMessage", () => {
	const limits = { min: 8, max: 72 };

	it("traduce cada código del servidor", () => {
		const es = getStoreStartCopy("es");
		expect(startStoreErrorMessage(es, "invalid", 400, limits)).toBe("Tu contraseña debe tener entre 8 y 72 caracteres.");
		expect(startStoreErrorMessage(es, "slug_taken", 409, limits)).toBe(es.errors.slugTaken);
		expect(startStoreErrorMessage(es, "slug_invalid", 400, limits)).toBe(es.errors.slugInvalid);
		expect(startStoreErrorMessage(es, "not_found", 404, limits)).toBe(es.errors.notFound);
		expect(startStoreErrorMessage(es, "not_ready", 409, limits)).toBe(es.errors.notReady);
		expect(startStoreErrorMessage(es, "missing_link", 400, limits)).toBe(es.errors.missingLink);
		expect(startStoreErrorMessage(getStoreStartCopy("de"), "rate_limited", 429, limits)).toBe(getStoreStartCopy("de").errors.rateLimited);
	});

	it("sin código conocido: 429 es «demasiados intentos» y lo demás el error genérico", () => {
		const en = getStoreStartCopy("en");
		expect(startStoreErrorMessage(en, undefined, 429, limits)).toBe(en.errors.rateLimited);
		expect(startStoreErrorMessage(en, "error", 500, limits)).toBe(en.errorGeneric);
		expect(startStoreErrorMessage(en, "algo_nuevo", 400, limits)).toBe(en.errorGeneric);
		expect(startStoreErrorMessage(en, null, 502, limits)).toBe(en.errorGeneric);
	});
});
