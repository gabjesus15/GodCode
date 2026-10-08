/**
 * Sellado de secretos de integración (la API key del Resend propio de una empresa).
 *
 * **Este fichero es idéntico en los dos repositorios**, en:
 * - `GodCode/lib/email/secret-box.ts` (super admin, Node)
 * - `GodCode-Panel/supabase/functions/_shared/secret-box.ts` (Edge Function `coupon-emails`, Deno)
 *
 * Solo usa WebCrypto, que existe igual en Deno, Node y vitest. Los casos de
 * `secret-box-contract-cases.ts` fijan que un lado abra lo que selló el otro.
 *
 * Formato: `sk:v1:` + base64url(iv 12 bytes | tag 16 bytes | texto cifrado).
 * Llave: HKDF-SHA256 sobre `EMAIL_SENDER_SECRET_KEY` (32 bytes en base64), sal
 * vacía, info `company-email-sender:aes-256-gcm:v1`.
 */

const SEALED_PREFIX = "sk:v1:";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const ENCRYPTION_INFO = "company-email-sender:aes-256-gcm:v1";

export function isSealedSecret(value: unknown): value is string {
	return typeof value === "string" && value.startsWith(SEALED_PREFIX);
}

function decodeBase64(value: string) {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function encodeBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
	const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
	return decodeBase64(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
}

async function deriveKey(masterKeyBase64: string): Promise<CryptoKey> {
	let master: ReturnType<typeof decodeBase64>;
	try {
		master = decodeBase64(String(masterKeyBase64 ?? "").trim());
	} catch {
		throw new Error("secret_key_invalid");
	}
	if (master.length !== 32) throw new Error("secret_key_invalid");
	const hkdfKey = await crypto.subtle.importKey("raw", master, "HKDF", false, ["deriveKey"]);
	return crypto.subtle.deriveKey(
		{
			name: "HKDF",
			hash: "SHA-256",
			salt: new Uint8Array(0),
			info: new TextEncoder().encode(ENCRYPTION_INFO),
		},
		hkdfKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

export type SecretBox = {
	seal: (plain: string) => Promise<string>;
	open: (sealed: string) => Promise<string>;
};

/**
 * Prepara el sellador para una llave maestra. Lanza `secret_key_invalid` si la llave
 * no mide 32 bytes: sin llave válida no se guarda ni se usa ningún secreto.
 */
export async function createSecretBox(masterKeyBase64: string): Promise<SecretBox> {
	const key = await deriveKey(masterKeyBase64);

	return {
		async seal(plain) {
			const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
			// WebCrypto devuelve el texto cifrado con el tag pegado al final.
			const withTag = new Uint8Array(
				await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
			);
			const body = withTag.subarray(0, withTag.length - TAG_BYTES);
			const tag = withTag.subarray(withTag.length - TAG_BYTES);
			const packed = new Uint8Array(IV_BYTES + TAG_BYTES + body.length);
			packed.set(iv, 0);
			packed.set(tag, IV_BYTES);
			packed.set(body, IV_BYTES + TAG_BYTES);
			return SEALED_PREFIX + encodeBase64Url(packed);
		},
		async open(sealed) {
			if (!isSealedSecret(sealed)) throw new Error("secret_open_failed");
			const packed = decodeBase64Url(sealed.slice(SEALED_PREFIX.length));
			if (packed.length < IV_BYTES + TAG_BYTES) throw new Error("secret_open_failed");
			const iv = packed.subarray(0, IV_BYTES);
			const tag = packed.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
			const body = packed.subarray(IV_BYTES + TAG_BYTES);
			const withTag = new Uint8Array(body.length + TAG_BYTES);
			withTag.set(body, 0);
			withTag.set(tag, body.length);
			try {
				const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, withTag);
				return new TextDecoder().decode(plain);
			} catch {
				// Llave equivocada o dato alterado: GCM lo detecta.
				throw new Error("secret_open_failed");
			}
		},
	};
}

/** Los últimos 4 caracteres, para mostrar «••••abcd» sin revelar la key. */
export function secretLast4(plain: string): string {
	const trimmed = String(plain ?? "").trim();
	return trimmed.length > 8 ? trimmed.slice(-4) : "";
}
