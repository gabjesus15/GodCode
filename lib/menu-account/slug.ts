/**
 * Forma válida del slug público de un negocio.
 *
 * Isomorfo: lo usan los schemas zod de `/api/menu-account/*`. Rechazar aquí cualquier
 * cosa que no sea un slug evita que un valor como `/evil.com` llegue a construir rutas
 * o claves de caché.
 */
export const COMPANY_SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

export function isValidCompanySlug(value: string | null | undefined): value is string {
	return typeof value === "string" && COMPANY_SLUG_PATTERN.test(value);
}
