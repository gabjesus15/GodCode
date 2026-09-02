import "server-only";

import type { Database } from "@/types/supabase-database";

export type MenuClientAccountRow =
	Database["public"]["Tables"]["menu_client_accounts"]["Row"];

export type MenuClientLinkRequestRow =
	Database["public"]["Tables"]["menu_client_link_requests"]["Row"];

/**
 * Forma pública de la cuenta. Nunca incluye `auth_user_id` ni `client_id`: son
 * identificadores internos y el navegador no tiene por qué conocerlos.
 */
export type MenuAccountDto = {
	id: string;
	fullName: string;
	email: string;
	documentMasked: string;
	documentCountry: string | null;
	phone: string;
	preferredBranchId: string | null;
};

/** Sesión resuelta: la fila completa, para uso exclusivo del servidor. */
export type MenuAccountSession = {
	account: MenuClientAccountRow;
	authUserId: string;
};
