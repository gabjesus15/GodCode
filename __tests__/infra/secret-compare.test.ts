import { describe, expect, it } from "vitest";

import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";

/**
 * Estos secretos protegen endpoints que borran datos (cron de expiración,
 * suspensión de suscripciones) y la clave interna del microservicio. El caso que
 * más importa es el de abajo: un secreto sin configurar no puede abrir la puerta.
 */
describe("secretsMatch", () => {
	it("acepta el secreto correcto", () => {
		expect(secretsMatch("s3cr3t", "s3cr3t")).toBe(true);
	});

	it("rechaza uno distinto", () => {
		expect(secretsMatch("s3cr3t", "otro")).toBe(false);
	});

	it("rechaza un prefijo correcto pero incompleto", () => {
		expect(secretsMatch("s3cr", "s3cr3t")).toBe(false);
	});

	it.each([
		["indefinido", undefined],
		["nulo", null],
		["vacío", ""],
	])("un secreto esperado %s nunca valida", (_caso, expected) => {
		expect(secretsMatch("lo-que-sea", expected)).toBe(false);
		expect(secretsMatch("", expected)).toBe(false);
	});

	it.each([
		["indefinido", undefined],
		["nulo", null],
	])("un valor recibido %s no valida contra un secreto real", (_caso, received) => {
		expect(secretsMatch(received, "s3cr3t")).toBe(false);
	});

	it("no lanza con longitudes distintas", () => {
		// timingSafeEqual lanza si los buffers difieren en tamaño; por eso lo recibido se
		// lleva al largo del esperado antes de comparar.
		expect(() => secretsMatch("a", "una-clave-mucho-mas-larga")).not.toThrow();
		expect(secretsMatch("a", "una-clave-mucho-mas-larga")).toBe(false);
		expect(() => secretsMatch("una-clave-mucho-mas-larga", "a")).not.toThrow();
		expect(secretsMatch("una-clave-mucho-mas-larga", "a")).toBe(false);
	});

	it("rechaza el secreto correcto con bytes de más", () => {
		expect(secretsMatch("s3cr3t-extra", "s3cr3t")).toBe(false);
		// El relleno con ceros no hace pasar un secreto más corto ni uno con ceros al final.
		expect(secretsMatch("s3cr3t\u0000", "s3cr3t")).toBe(false);
		expect(secretsMatch("s3cr3t", "s3cr3t\u0000")).toBe(false);
	});

	it("compara bytes UTF-8, no caracteres", () => {
		expect(secretsMatch("contraseña", "contraseña")).toBe(true);
		expect(secretsMatch("contrasena", "contraseña")).toBe(false);
	});
});

describe("readBearerSecret", () => {
	it.each([
		["Bearer abc", "abc"],
		["bearer abc", "abc"],
		["BEARER   abc  ", "abc"],
		["abc", "abc"],
	])("extrae el secreto de %j", (header, expected) => {
		expect(readBearerSecret(header)).toBe(expected);
	});

	it.each([
		["sin cabecera", null],
		["indefinida", undefined],
		["vacía", ""],
	])("una cabecera %s da cadena vacía", (_caso, header) => {
		expect(readBearerSecret(header)).toBe("");
	});
});
