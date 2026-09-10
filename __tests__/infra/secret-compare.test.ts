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
		// timingSafeEqual lanza si los buffers difieren en tamaño; por eso se
		// comparan digests y no los bytes originales.
		expect(() => secretsMatch("a", "una-clave-mucho-mas-larga")).not.toThrow();
		expect(secretsMatch("a", "una-clave-mucho-mas-larga")).toBe(false);
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
