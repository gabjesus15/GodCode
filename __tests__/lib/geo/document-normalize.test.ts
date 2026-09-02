import { describe, expect, it } from "vitest";

import {
	BLOCKED_DOCUMENTS,
	maskDocument,
	normalizeDocument,
} from "@/lib/geo/document-normalize";

/** Extrae el valor normalizado o falla el test con la razón del rechazo. */
function expectOk(raw: string, country: string | null) {
	const result = normalizeDocument(raw, country);
	if (!result.ok) {
		throw new Error(`esperaba ok, recibí "${result.reason}" para "${raw}" (${country})`);
	}
	return result;
}

describe("normalizeDocument · Chile", () => {
	it("canoniza el mismo RUT escrito de varias formas", () => {
		// 12.345.678-5 es un RUT válido por módulo 11.
		const variants = ["12.345.678-5", "123456785", "12345678-5", " 12.345.678-5 "];
		for (const variant of variants) {
			expect(expectOk(variant, "CL").normalized).toBe("123456785");
		}
	});

	it("acepta dígito verificador K en minúscula", () => {
		expect(expectOk("12.674.885-k", "CL").normalized).toBe("12674885K");
	});

	it("quita ceros a la izquierda del cuerpo", () => {
		expect(expectOk("0012.345.678-5", "CL").normalized).toBe("123456785");
	});

	it("rechaza un RUT con dígito verificador incorrecto", () => {
		expect(normalizeDocument("12.345.678-9", "CL")).toEqual({
			ok: false,
			reason: "invalid_format",
		});
	});

	it("resuelve el país por nombre además de por código", () => {
		expect(expectOk("12.345.678-5", "Chile").country).toBe("CL");
	});

	it("usa Chile como fallback cuando no hay país", () => {
		expect(expectOk("12.345.678-5", null).country).toBe("CL");
	});
});

describe("normalizeDocument · Venezuela", () => {
	it("canoniza cédula con y sin guión", () => {
		expect(expectOk("V-29655152", "VE").normalized).toBe("V29655152");
		expect(expectOk("v29655152", "VE").normalized).toBe("V29655152");
	});

	it("acepta los prefijos J, E y G", () => {
		for (const prefix of ["J", "E", "G"]) {
			expect(expectOk(`${prefix}-12345678`, "VE").normalized).toBe(`${prefix}12345678`);
		}
	});

	it("rechaza cédula sin prefijo de letra", () => {
		expect(normalizeDocument("29655152", "VE")).toEqual({
			ok: false,
			reason: "invalid_format",
		});
	});

	it("rechaza prefijo no válido", () => {
		expect(normalizeDocument("X-29655152", "VE")).toEqual({
			ok: false,
			reason: "invalid_format",
		});
	});
});

describe("normalizeDocument · Colombia", () => {
	it("quita puntos y ceros a la izquierda", () => {
		expect(expectOk("1.098.765.432", "CO").normalized).toBe("1098765432");
		expect(expectOk("0001234567", "CO").normalized).toBe("1234567");
	});

	it("rechaza letras", () => {
		expect(normalizeDocument("12A4567", "CO")).toEqual({
			ok: false,
			reason: "invalid_format",
		});
	});
});

describe("normalizeDocument · guardas comunes", () => {
	it("rechaza vacío", () => {
		expect(normalizeDocument("", "CL")).toEqual({ ok: false, reason: "empty" });
		expect(normalizeDocument("   ", "CL")).toEqual({ ok: false, reason: "empty" });
		expect(normalizeDocument(null, "CL")).toEqual({ ok: false, reason: "empty" });
	});

	it("rechaza los residuos del POS que hoy están en clients", () => {
		// "19" es el genérico con 346 filas; "00" y "43" también aparecen repetidos.
		// Caen por longitud antes de llegar a la lista negra, pero lo que importa
		// es que ninguno pueda registrarse.
		for (const junk of ["19", "00", "43"]) {
			expect(normalizeDocument(junk, "CO").ok).toBe(false);
			expect(normalizeDocument(junk, "CL").ok).toBe(false);
		}
		// "SINRUT" solo llega a la lista negra donde se admiten letras: en CO el
		// formato numérico lo rechaza antes.
		expect(normalizeDocument("SINRUT", "AR")).toEqual({ ok: false, reason: "blocked" });
		expect(normalizeDocument("SINRUT", "CO")).toEqual({ ok: false, reason: "invalid_format" });
	});

	it("rechaza un solo carácter repetido", () => {
		expect(normalizeDocument("00000000", "CO")).toEqual({ ok: false, reason: "blocked" });
		expect(normalizeDocument("1111111", "CO")).toEqual({ ok: false, reason: "blocked" });
	});

	it("rechaza documentos demasiado cortos o largos", () => {
		expect(normalizeDocument("1234", "CO")).toEqual({ ok: false, reason: "too_short" });
		expect(normalizeDocument("12345678901234567890123456789012345", "CO")).toEqual({
			ok: false,
			reason: "too_long",
		});
	});

	it("no bloquea un documento legítimo parecido a una secuencia", () => {
		// 45678 no está en la lista y no es un carácter repetido.
		expect(expectOk("45678", "CO").normalized).toBe("45678");
	});

	it("la lista de bloqueados está en mayúsculas y sin separadores", () => {
		for (const entry of BLOCKED_DOCUMENTS) {
			expect(entry).toBe(entry.toUpperCase());
			expect(entry).toMatch(/^[0-9A-Z]+$/);
		}
	});
});

describe("maskDocument", () => {
	it("conserva los dos primeros y el último carácter", () => {
		expect(maskDocument("123456785")).toBe("12······5");
		expect(maskDocument("V29655152")).toBe("V2······2");
	});

	it("devuelve tal cual los valores muy cortos", () => {
		expect(maskDocument("12")).toBe("12");
		expect(maskDocument("")).toBe("");
		expect(maskDocument(null)).toBe("");
	});
});
