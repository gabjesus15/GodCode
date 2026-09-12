import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";

/**
 * A quién pertenece un correo dentro del proyecto Supabase.
 *
 * - `free`        → nadie lo usa: se puede dar de alta.
 * - `menu_client` → ya es de un cliente del menú: se ofrece vincular el negocio.
 * - `staff`       → es de un empleado, CEO o super-admin: se rechaza siempre.
 * - `foreign`     → existe en `auth.users` pero no lo creamos como cliente: se rechaza.
 *
 * `staff` y `foreign` se rechazan por la misma razón: vincular una cuenta de cliente
 * sobre el usuario de un empleado dejaría que un cambio de contraseña hecho desde el
 * menú alterara la contraseña del panel.
 */
export type EmailOwnership = "free" | "menu_client" | "staff" | "foreign";

export type EmailClassification = {
	ownership: EmailOwnership;
	/** Solo presente cuando `ownership === "menu_client"`. */
	authUserId: string | null;
};

export function normalizeEmail(raw: string | null | undefined): string {
	return String(raw ?? "").trim().toLowerCase();
}

/**
 * Nota sobre `.eq` vs `.ilike`: en PostgREST, `ilike` trata `_` y `%` como comodines,
 * y los correos reales contienen `_` de forma legítima (`juan_perez@gmail.com` haría
 * match contra `juanXperez@gmail.com`). Todos los lookups de aquí usan `.eq` sobre el
 * correo ya normalizado a minúsculas.
 */
export async function classifyEmail(rawEmail: string): Promise<EmailClassification> {
	const email = normalizeEmail(rawEmail);
	if (!email) return { ownership: "free", authUserId: null };

	// 1) Staff del SaaS y de los tenants. Se comprueba primero: es el rechazo duro.
	const [{ data: adminRow }, { data: staffRow }] = await Promise.all([
		supabaseAdmin.from("admin_users").select("id").eq("email", email).maybeSingle(),
		supabaseAdmin.from("users").select("id").eq("email", email).maybeSingle(),
	]);
	if (adminRow || staffRow) return { ownership: "staff", authUserId: null };

	// `public.users.email` puede tener mayúsculas heredadas; se reintenta sin normalizar
	// solo si el correo de entrada difiere, para no perder una colisión real.
	if (email !== rawEmail) {
		const { data: staffRawRow } = await supabaseAdmin
			.from("users")
			.select("id")
			.eq("email", rawEmail)
			.maybeSingle();
		if (staffRawRow) return { ownership: "staff", authUserId: null };
	}

	// 2) ¿Ya es cliente del menú? Basta con nuestra tabla: nosotros la escribimos.
	const { data: accountRow } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("auth_user_id")
		.eq("email", email)
		.not("auth_user_id", "is", null)
		.limit(1)
		.maybeSingle();

	if (accountRow?.auth_user_id) {
		return { ownership: "menu_client", authUserId: String(accountRow.auth_user_id) };
	}

	// 3) Puede existir en `auth.users` sin estar en ninguna de las tablas anteriores
	// (creado a mano, o un alta nuestra que quedó a medias). No se toca.
	const existing = await findAuthUserByEmail(email);
	if (existing) {
		return existing.isMenuClient
			? { ownership: "menu_client", authUserId: existing.id }
			: { ownership: "foreign", authUserId: null };
	}

	return { ownership: "free", authUserId: null };
}

type AuthUserLookup = { id: string; isMenuClient: boolean };

/**
 * Busca un usuario en `auth.users` por correo exacto.
 *
 * La Admin API no expone "get user by email", así que se pagina `listUsers`. Es una
 * ruta poco frecuente (solo altas), y solo se llega aquí cuando el correo no apareció
 * en ninguna de nuestras tablas.
 */
export async function findAuthUserByEmail(rawEmail: string): Promise<AuthUserLookup | null> {
	const email = normalizeEmail(rawEmail);
	if (!email) return null;

	const perPage = 200;
	const maxPages = 25; // Tope duro: no recorrer indefinidamente si el proyecto crece.

	for (let page = 1; page <= maxPages; page += 1) {
		const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
		if (error) return null;

		const users = data?.users ?? [];
		const match = users.find((user) => normalizeEmail(user.email) === email);
		if (match) {
			const kind = (match.app_metadata as { kind?: unknown } | null)?.kind;
			return { id: match.id, isMenuClient: kind === "menu_client" };
		}

		if (users.length < perPage) break;
	}

	return null;
}
