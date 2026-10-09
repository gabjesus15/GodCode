import { timingSafeEqual } from "node:crypto";

/**
 * Comparación de secretos en tiempo constante.
 *
 * `recibido !== esperado` corta en el primer byte distinto, así que el tiempo de
 * respuesta filtra cuántos caracteres del secreto son correctos. Con un endpoint
 * público eso es un oráculo suficiente para reconstruir la clave byte a byte.
 *
 * `timingSafeEqual` lanza si los buffers tienen distinto largo, y cortar antes cuando el
 * largo no coincide filtraría el tamaño del secreto. Por eso lo recibido se copia en un
 * buffer del largo del esperado (recortado o con ceros al final), se compara entero y el
 * largo se mira recién al final, sin cortar antes.
 *
 * Antes se comparaban digests SHA-256 de los dos lados, que también es seguro, pero CodeQL
 * (js/insufficient-password-hash) lo leía como guardar una contraseña con un hash rápido.
 * Aquí no se guarda nada: solo se compara, y ya sin hash.
 */
export function secretsMatch(received: string | null | undefined, expected: string | null | undefined): boolean {
	// Un secreto sin configurar nunca valida: fail-closed, no fail-open.
	if (!expected) return false;

	const expectedBytes = Buffer.from(expected, "utf8");
	const receivedBytes = Buffer.from(String(received ?? ""), "utf8");
	const candidate = Buffer.alloc(expectedBytes.length);
	receivedBytes.copy(candidate, 0, 0, expectedBytes.length);

	const sameBytes = timingSafeEqual(candidate, expectedBytes);
	const sameLength = receivedBytes.length === expectedBytes.length;
	return sameBytes && sameLength;
}

/** Extrae el secreto de una cabecera `Authorization: Bearer <secreto>`. */
export function readBearerSecret(headerValue: string | null | undefined): string {
	return String(headerValue ?? "").replace(/^Bearer\s+/i, "").trim();
}
