/**
 * URL canónica de la aplicación (dominio principal, sin subdominio de tenant).
 * Usada para enlaces en correos (verificación onboarding, etc.) y redirecciones.
 * Debe ser el mismo dominio con el que los usuarios acceden (ej. https://www.godcode.me).
 */

export function getAppUrl(): string {
	const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
	if (explicit) return explicit.replace(/\/$/, "");

	const base = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN?.trim();
	if (base) {
		const protocol = process.env.NEXT_PUBLIC_TENANT_PROTOCOL?.trim() || "https";
		const host = base.replace(/^https?:\/\//, "").replace(/\/$/, "");
		return `${protocol}://${host}`;
	}

	const vercel = process.env.VERCEL_URL?.trim();
	if (vercel && process.env.NODE_ENV !== "production") return `https://${vercel}`;

	return "http://localhost:3000";
}
