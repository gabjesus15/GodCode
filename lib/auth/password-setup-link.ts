import type { SupabaseClient } from "@supabase/supabase-js";

import { getAppUrl } from "@/lib/tenant/app-url";

/** Ruta que canjea el token y deja la sesión lista para elegir contraseña. */
export const PASSWORD_LINK_CONFIRM_PATH = "/login/confirmar";

/**
 * Enlace de un solo uso para crear o cambiar la contraseña de un panel.
 *
 * Usa el token de recuperación de Supabase, pero apunta a nuestra app en vez de al
 * endpoint de Supabase: `/login/confirmar` lo canjea en el servidor (queda la sesión en
 * cookies) y manda a elegir la contraseña. Así no dependemos de las plantillas ni del
 * SMTP de Supabase; el correo sale por Resend como el resto. No envía nada por sí solo.
 */
export async function createPasswordSetupLink(
	supabaseAdmin: SupabaseClient,
	email: string,
): Promise<string | null> {
	const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: "recovery", email });
	const hashedToken = data?.properties?.hashed_token;
	if (error || !hashedToken) return null;

	const url = new URL(PASSWORD_LINK_CONFIRM_PATH, getAppUrl());
	url.searchParams.set("token_hash", hashedToken);
	url.searchParams.set("type", "recovery");
	return url.toString();
}
