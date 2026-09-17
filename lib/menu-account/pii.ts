import "server-only";

import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from "node:crypto";

import { logger } from "@/lib/infra/logger";

import { menuAccountErrors } from "./errors";

/**
 * Cifrado de los datos personales de la cuenta de cliente del menú.
 *
 * - `sealPii` / `openPii`: AES-256-GCM para lo que hay que volver a leer (nombre,
 *   teléfono, documento tal como se escribió, direcciones). Cada valor lleva su IV
 *   aleatorio, así que dos valores iguales no se ven iguales en la base.
 * - `lookupHash`: HMAC-SHA256 para lo que solo se busca por igualdad (documento
 *   normalizado y correo). Es determinista a propósito: permite el login por
 *   documento y el índice único sin guardar el dato legible.
 *
 * La llave (`MENU_ACCOUNT_PII_KEY`, 32 bytes en base64) vive fuera de la base, en el
 * entorno del servidor. Si se pierde, los datos cifrados no se pueden recuperar. Sin
 * llave se falla cerrado: nunca se guarda un dato personal en claro.
 *
 * Los valores antiguos en claro se siguen leyendo (`openPii` los devuelve tal cual) y
 * se cifran la próxima vez que se usa la cuenta.
 */

const SEALED_PREFIX = "enc:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
/** 128 bits: sobra para evitar colisiones y cabe en el CHECK de 32 caracteres del documento. */
const LOOKUP_HASH_HEX_LENGTH = 32;
const LOOKUP_HASH_PATTERN = /^[0-9a-f]{32}$/;

type PiiKeys = { encryption: Buffer; lookup: Buffer };

let cachedKeys: { raw: string; keys: PiiKeys } | null = null;

function loadKeys(): PiiKeys {
	const raw = process.env.MENU_ACCOUNT_PII_KEY?.trim() ?? "";
	if (cachedKeys && cachedKeys.raw === raw) return cachedKeys.keys;

	const master = Buffer.from(raw, "base64");
	if (master.length !== 32) {
		logger.error("menu_account_pii_key_invalid", { bytes: master.length });
		throw menuAccountErrors.internal();
	}

	// Subllaves separadas: la llave de cifrado nunca se usa para el HMAC y viceversa.
	const derive = (info: string) =>
		Buffer.from(hkdfSync("sha256", master, Buffer.alloc(0), info, 32));
	const keys = {
		encryption: derive("menu-account-pii:aes-256-gcm:v1"),
		lookup: derive("menu-account-pii:hmac-sha256:v1"),
	};
	cachedKeys = { raw, keys };
	return keys;
}

export function isSealedPii(value: string | null | undefined): boolean {
	return typeof value === "string" && value.startsWith(SEALED_PREFIX);
}

/** Cifra un texto. `null` y `""` se guardan tal cual: no hay nada que proteger. */
export function sealPii(value: string): string;
export function sealPii(value: string | null | undefined): string | null;
export function sealPii(value: string | null | undefined): string | null {
	if (value == null) return null;
	if (value === "" || isSealedPii(value)) return value;

	const { encryption } = loadKeys();
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv("aes-256-gcm", encryption, iv);
	const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return SEALED_PREFIX + Buffer.concat([iv, tag, body]).toString("base64url");
}

/** Descifra un valor de `sealPii`. Un valor antiguo en claro se devuelve sin tocar. */
export function openPii(value: string): string;
export function openPii(value: string | null | undefined): string | null;
export function openPii(value: string | null | undefined): string | null {
	if (value == null) return null;
	if (!isSealedPii(value)) return value;

	const { encryption } = loadKeys();
	try {
		const packed = Buffer.from(value.slice(SEALED_PREFIX.length), "base64url");
		const iv = packed.subarray(0, IV_BYTES);
		const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
		const body = packed.subarray(IV_BYTES + TAG_BYTES);
		const decipher = createDecipheriv("aes-256-gcm", encryption, iv);
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
	} catch {
		// Llave equivocada o dato alterado: GCM lo detecta. No se devuelve basura.
		logger.error("menu_account_pii_open_failed");
		throw menuAccountErrors.internal();
	}
}

export type LookupKind = "document" | "email";

/**
 * Huella para buscar por igualdad sin guardar el dato. `kind` separa dominios: un
 * documento y un correo con el mismo texto no comparten huella.
 */
export function lookupHash(kind: LookupKind, normalizedValue: string): string {
	const { lookup } = loadKeys();
	return createHmac("sha256", lookup)
		.update(`${kind}:${normalizedValue}`)
		.digest("hex")
		.slice(0, LOOKUP_HASH_HEX_LENGTH);
}

export function isLookupHash(value: string | null | undefined): boolean {
	return typeof value === "string" && LOOKUP_HASH_PATTERN.test(value);
}
