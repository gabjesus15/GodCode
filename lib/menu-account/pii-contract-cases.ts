/**
 * Casos de contrato del cifrado de datos personales de las cuentas del menú.
 *
 * **Este fichero es idéntico en los dos repositorios**, en:
 * - `saas-godcode-admin/lib/menu-account/pii-contract-cases.ts`
 * - `Saas-Godcode-paneladmin-ceo/supabase/functions/_shared/pii-contract-cases.ts`
 *
 * El Portal cifra con `sealPii` (Node) y el panel descifra en la Edge Function
 * `client-pii` con un port en WebCrypto. Si el formato o la derivación de la llave
 * cambian en un lado y no en el otro, el personal deja de ver los datos. Estos
 * casos se sellaron una vez con la llave de test (32 bytes en cero, la de
 * `vitest.config.ts`) y los dos lados tienen que abrirlos.
 *
 * Al cambiar el formato:
 * 1. Sube la versión del prefijo (`enc:v2:`) y agrega casos nuevos; no reescribas estos.
 * 2. Copia el fichero al otro repositorio. Comprueba con:
 *    `diff --strip-trailing-cr <ruta-portal> <ruta-panel>` (debe salir vacío).
 */

/** Llave de test: 32 bytes en cero, en base64. Nunca es la de producción. */
export const PII_CONTRACT_TEST_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export type PiiContractCase = {
	name: string;
	plain: string;
	sealed: string;
};

export const PII_CONTRACT_CASES: PiiContractCase[] = [
	{
		name: "nombre simple",
		plain: "Jhon Belandria",
		sealed: "enc:v1:QxiUF9VIPl_qRWuU__y5WSH1IoCk9SiFdYbMxICTdBSiC6U0VxDvAbLh",
	},
	{
		name: "tildes, eñe y emoji",
		plain: "María José Ñúñez 🍕",
		sealed: "enc:v1:WA504aWgdWYKu_B-vLFDavuRiokhCaGlMEHmOSaiKuKBx85aF6bsVIgOrWe7JRvT_xAqi2zF",
	},
	{
		name: "teléfono",
		plain: "+58 412 342 3424",
		sealed: "enc:v1:NT0W7upHCSzd9Aj7jOWQ_XY53AtTz35khuR3RXCMCm_qWe46AMzE11vRB2s",
	},
	{
		name: "documento",
		plain: "V-27493256",
		sealed: "enc:v1:qQGAOEjClquHzoRI1LZnleNG1KlyBtEwe-BUvHMraqx329-4ssM",
	},
	{
		name: "dirección en JSON",
		plain: "{\"address\":\"Av. Principal 123, Depto 4B\",\"reference\":\"portón verde\",\"lat\":-33.45,\"lng\":-70.66}",
		sealed: "enc:v1:__ICAMW-Od5TD5tSRd6wAUMAdLg83LR9QoP1M6RQp0adSlyVLEd2ikfwm4n5ullvJlbT9aBLd1Cbk6IuPMNEETYLskshxpdwvFU3tvb9qw2eA5VwRtT-E07IIkmkDMvKFyceJT5OD3KPvse8zxQz2kpKw7dsD5YNIs8Y",
	},
];
