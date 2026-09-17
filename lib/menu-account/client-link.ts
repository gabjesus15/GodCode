import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";

import { menuAccountErrors } from "./errors";
import type { MenuClientAccountRow } from "./types";

/**
 * Devuelve la ficha de `clients` que respalda la cuenta, creándola si hace falta.
 *
 * Nunca se vincula con una ficha histórica del POS buscando por teléfono o documento:
 * esa tabla tiene datos sucios (RUT genérico "19", teléfonos de relleno) y vincular
 * por coincidencia pegaría el historial de otra persona. Se crea una ficha nueva y
 * limpia, y a partir de ahí los pedidos llegan con `p_client_id`.
 */
export async function ensureMenuAccountClient(account: MenuClientAccountRow): Promise<string> {
	if (account.client_id) {
		const { data: existing } = await supabaseAdmin
			.from("clients")
			.select("id")
			.eq("id", account.client_id)
			.eq("company_id", account.company_id)
			.maybeSingle();
		if (existing) return String(existing.id);
		// La ficha apunta a otro negocio o desapareció entre lecturas: se crea otra.
	}

	const { data: created, error: createError } = await supabaseAdmin
		.from("clients")
		.insert({
			company_id: account.company_id,
			name: account.full_name,
			phone: account.phone,
			phone_normalized: account.phone_normalized,
			rut: account.document_raw ?? account.document_normalized,
			total_orders: 0,
			total_spent: 0,
		})
		.select("id")
		.single();

	if (createError || !created) {
		logger.error("menu_account_client_create_failed", { message: createError?.message });
		throw menuAccountErrors.internal();
	}

	const clientId = String(created.id);

	// Condicional sobre el valor leído: si dos peticiones corren a la vez, solo una
	// gana y la otra adopta la ficha ganadora y borra la suya.
	let claim = supabaseAdmin
		.from("menu_client_accounts")
		.update({ client_id: clientId })
		.eq("id", account.id);
	claim = account.client_id ? claim.eq("client_id", account.client_id) : claim.is("client_id", null);
	const { data: claimed } = await claim.select("client_id").maybeSingle();

	if (claimed?.client_id && String(claimed.client_id) === clientId) return clientId;

	await supabaseAdmin.from("clients").delete().eq("id", clientId);

	const { data: current } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("client_id")
		.eq("id", account.id)
		.maybeSingle();

	if (!current?.client_id) {
		logger.error("menu_account_client_claim_failed", { accountId: account.id });
		throw menuAccountErrors.internal();
	}
	return String(current.client_id);
}
