import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "v1:";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

/**
 * Deriva 32 bytes para AES-256-GCM desde `UBER_SECRETS_ENCRYPTION_KEY`:
 * - 64 caracteres hex
 * - base64 que decodifica a exactamente 32 bytes
 * - cualquier otro string: SHA-256 (útil para passphrase en dev)
 */
export function getUberSecretsKeyBuffer(): Buffer | null {
	const raw = process.env.UBER_SECRETS_ENCRYPTION_KEY?.trim();
	if (!raw) return null;
	if (/^[0-9a-fA-F]{64}$/.test(raw)) {
		return Buffer.from(raw, "hex");
	}
	try {
		const b = Buffer.from(raw, "base64");
		if (b.length === 32) return b;
	} catch {
		/* ignore */
	}
	return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptUberClientSecret(plain: string): { ok: true; ciphertext: string } | { ok: false; message: string } {
	const key = getUberSecretsKeyBuffer();
	if (!key) {
		return {
			ok: false,
			message:
				"Define UBER_SECRETS_ENCRYPTION_KEY en el servidor para guardar el Client Secret cifrado.",
		};
	}
	const iv = randomBytes(IV_LEN);
	const cipher = createCipheriv(ALGO, key, iv);
	const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	const packed = Buffer.concat([iv, tag, enc]);
	return { ok: true, ciphertext: `${PREFIX}${packed.toString("base64url")}` };
}

export function decryptUberClientSecret(ciphertext: string): string | null {
	if (!ciphertext.startsWith(PREFIX)) return null;
	const key = getUberSecretsKeyBuffer();
	if (!key) return null;
	let buf: Buffer;
	try {
		buf = Buffer.from(ciphertext.slice(PREFIX.length), "base64url");
	} catch {
		return null;
	}
	if (buf.length < IV_LEN + TAG_LEN + 1) return null;
	const iv = buf.subarray(0, IV_LEN);
	const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
	const data = buf.subarray(IV_LEN + TAG_LEN);
	try {
		const decipher = createDecipheriv(ALGO, key, iv);
		decipher.setAuthTag(tag);
		return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
	} catch {
		return null;
	}
}
