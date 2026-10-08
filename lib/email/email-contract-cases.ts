/**
 * Casos de contrato de los correos de cupones: sellado de la API key y firma del
 * enlace de baja.
 *
 * **Este fichero es idéntico en los dos repositorios**, en:
 * - `GodCode/lib/email/email-contract-cases.ts`
 * - `GodCode-Panel/supabase/functions/_shared/email-contract-cases.ts`
 *
 * El super admin (GodCode) sella la key y la Edge Function `coupon-emails` (panel)
 * la abre; la función firma el enlace de baja y GodCode lo verifica. Si el formato
 * cambia en un lado y no en el otro, se rompe en silencio. Estos valores se
 * generaron una vez y los dos lados tienen que reproducirlos.
 *
 * Al cambiar el formato: sube la versión (`sk:v2:`, `unsub:v2`), agrega casos nuevos
 * sin reescribir estos y copia el fichero al otro repo. Comprueba con
 * `diff --strip-trailing-cr <ruta-godcode> <ruta-panel>` (debe salir vacío).
 */

/** Llave de test: 32 bytes en cero, en base64. Nunca es la de producción. */
export const SECRET_BOX_TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export const SECRET_BOX_CASES: Array<{ name: string; plain: string; sealed: string }> = [
	{
		name: "API key de Resend",
		plain: "re_123456789_abcdefghijklmnopqrstuv",
		sealed: "sk:v1:1mmwjKRYbSSGeUq8x6ay5fB6q2gBc3h5pp5YZ_9xWwGIEyk196HYevivfT7lLVt_tLumTuFSFouraGhzHKJk",
	},
	{
		name: "tildes y emoji",
		plain: "re_Ñandú_🍣_clave",
		sealed: "sk:v1:YqYx5ZeZ-8Buh5FRzUQyyXgXtBcXxSAg4zwmdI6PFKRJD8uTdHauaRWvr-pITpmgBg",
	},
	{
		name: "vacío",
		plain: "",
		sealed: "sk:v1:g5Wy0LE07JTSsvKIVwAoa2N1BMkQzhtrGqg_KQ",
	},
];

/** Secreto de test del enlace de baja. Nunca es el de producción. */
export const UNSUBSCRIBE_TEST_SECRET = "test-unsubscribe-secret-0123456789abcdef";

export const UNSUBSCRIBE_CASES: Array<{ accountId: string; companyId: string; signature: string }> = [
	{
		accountId: "11111111-2222-4333-8444-555555555555",
		companyId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
		signature: "Yu2b9rsgmKswn8_ySiWQ22q67p2Pi8hoIor8GaqFouw",
	},
];
