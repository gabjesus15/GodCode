/**
 * Enlace de baja de los correos de cupones.
 *
 * **Este fichero es idéntico en los dos repositorios**, en:
 * - `GodCode/lib/email/unsubscribe-token.ts` (la página de baja)
 * - `GodCode-Panel/supabase/functions/_shared/unsubscribe-token.ts` (quien manda el correo)
 *
 * El enlace lleva la cuenta, la empresa y una firma HMAC-SHA256 con
 * `EMAIL_UNSUBSCRIBE_SECRET`: sin la firma nadie puede dar de baja una cuenta ajena
 * cambiando el id en la URL. Solo WebCrypto, igual en Deno, Node y vitest.
 */

const SIGN_PREFIX = "unsub:v1";
const MIN_SECRET_LENGTH = 32;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function encodeBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
	return encodeBase64Url(new Uint8Array(signature));
}

function assertSecret(secret: string): void {
	if (String(secret ?? "").length < MIN_SECRET_LENGTH) throw new Error("unsubscribe_secret_invalid");
}

/** Firma de la baja de esa cuenta en esa empresa. */
export async function signUnsubscribe(secret: string, accountId: string, companyId: string): Promise<string> {
	assertSecret(secret);
	return hmac(secret, `${SIGN_PREFIX}:${accountId.toLowerCase()}:${companyId.toLowerCase()}`);
}

/** Compara en tiempo constante; una firma de otra cuenta o empresa no sirve. */
export async function verifyUnsubscribe(
	secret: string,
	accountId: string,
	companyId: string,
	signature: string,
): Promise<boolean> {
	if (!UUID_RE.test(accountId) || !UUID_RE.test(companyId)) return false;
	const expected = await signUnsubscribe(secret, accountId, companyId);
	const given = String(signature ?? "");
	if (given.length !== expected.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
	return diff === 0;
}

/** `https://www.godcode.me/api/email/unsubscribe?a=…&c=…&s=…` */
export async function buildUnsubscribeUrl(
	baseUrl: string,
	secret: string,
	accountId: string,
	companyId: string,
): Promise<string> {
	const signature = await signUnsubscribe(secret, accountId, companyId);
	const params = new URLSearchParams({ a: accountId, c: companyId, s: signature });
	return `${baseUrl.replace(/\/+$/, "")}/api/email/unsubscribe?${params.toString()}`;
}
