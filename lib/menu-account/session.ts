import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { maskDocument } from "@/lib/geo/document-normalize";

import { menuAccountErrors } from "./errors";
import type { MenuAccountDto, MenuAccountSession, MenuClientAccountRow } from "./types";

/**
 * Traduce la sesión Supabase del scope `menu-client` a la cuenta de ESTE negocio.
 *
 * Es el único punto del sistema que hace esa traducción, y siempre filtra por
 * `company_id`. Esto no es redundante con la cookie: en dominio principal
 * (`godcode.me/{slug}/mi-cuenta`) todos los negocios comparten host y por tanto la
 * misma cookie, así que alguien con sesión en el negocio A llega al B con un token
 * válido. El filtro por company es lo que evita que vea la cuenta equivocada.
 *
 * Devuelve `null` (no lanza) cuando no hay sesión, la cuenta es de otro negocio o
 * está desactivada: los tres casos se renderizan igual, como "no logueado".
 */
export async function getMenuAccountSession(
	companyId: string,
): Promise<MenuAccountSession | null> {
	const supabase = await createSupabaseServerClient("menu-client");

	const { data, error } = await supabase.auth.getUser();
	if (error || !data?.user?.id) return null;

	const authUserId = data.user.id;

	const { data: account } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("*")
		.eq("auth_user_id", authUserId)
		.eq("company_id", companyId)
		.maybeSingle();

	if (!account || account.is_active === false) return null;

	return { account: account as MenuClientAccountRow, authUserId };
}

/** Igual que `getMenuAccountSession`, pero lanza 401 en vez de devolver `null`. */
export async function requireMenuAccount(companyId: string): Promise<MenuAccountSession> {
	const session = await getMenuAccountSession(companyId);
	if (!session) throw menuAccountErrors.unauthorized();
	return session;
}

/** Proyección segura de la fila para mandarla al navegador. */
export function toMenuAccountDto(account: MenuClientAccountRow): MenuAccountDto {
	return {
		id: account.id,
		fullName: account.full_name,
		email: account.email,
		documentMasked: maskDocument(account.document_normalized),
		documentCountry: account.document_country,
		phone: account.phone,
		preferredBranchId: account.preferred_branch_id,
	};
}
