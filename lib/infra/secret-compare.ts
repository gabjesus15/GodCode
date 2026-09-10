import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Comparación de secretos en tiempo constante.
 *
 * `recibido !== esperado` corta en el primer byte distinto, así que el tiempo de
 * respuesta filtra cuántos caracteres del secreto son correctos. Con un endpoint
 * público eso es un oráculo suficiente para reconstruir la clave byte a byte.
 *
 * Se comparan los digest SHA-256 y no los bytes originales por dos razones:
 * `timingSafeEqual` lanza si los buffers tienen distinta longitud, y comparar la
 * longitud por separado filtraría el tamaño del secreto.
 */
export function secretsMatch(received: string | null | undefined, expected: string | null | undefined): boolean {
	// Un secreto sin configurar nunca valida: fail-closed, no fail-open.
	if (!expected) return false;

	const receivedDigest = createHash("sha256").update(String(received ?? ""), "utf8").digest();
	const expectedDigest = createHash("sha256").update(expected, "utf8").digest();

	return timingSafeEqual(receivedDigest, expectedDigest);
}

/** Extrae el secreto de una cabecera `Authorization: Bearer <secreto>`. */
export function readBearerSecret(headerValue: string | null | undefined): string {
	return String(headerValue ?? "").replace(/^Bearer\s+/i, "").trim();
}
