import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";

import { shortDisplayName } from "./display-name";
import { menuAccountErrors } from "./errors";
import { isSealedPii, sealPii } from "./pii";
import type { MenuClientAccountRow } from "./types";

/**
 * Lo que guarda la ficha de una cuenta: nombre corto en claro (cocina y caja llaman
 * a la persona) y teléfono y documento cifrados. `phone_normalized` va vacío para
 * que ninguna búsqueda por teléfono de un comprador rápido caiga en esta ficha.
 * El RPC de pedidos copia estos valores a cada pedido de la cuenta.
 *
 * Recibe la cuenta ya descifrada (la de la sesión).
 */
export function accountClientFields(account: MenuClientAccountRow) {
	return {
		name: shortDisplayName(account.full_name),
		phone: sealPii(account.phone ?? ""),
		phone_normalized: null,
		rut: sealPii(account.document_raw ?? account.document_normalized ?? null),
	};
}

type ClientContactRow = {
	id: string;
	name: string | null;
	phone: string | null;
	phone_normalized: string | null;
	rut: string | null;
};

function needsSealing(row: ClientContactRow, account: MenuClientAccountRow): boolean {
	return (
		(Boolean(row.phone) && !isSealedPii(row.phone)) ||
		(Boolean(row.rut) && !isSealedPii(row.rut)) ||
		row.phone_normalized != null ||
		row.name !== shortDisplayName(account.full_name)
	);
}

/**
 * Pone la ficha de la cuenta al día: la cifra si es de antes del cifrado y copia el
 * nombre corto si la persona lo cambió en su perfil.
 */
export async function syncMenuAccountClient(account: MenuClientAccountRow): Promise<void> {
	if (!account.client_id) return;
	const { error } = await supabaseAdmin
		.from("clients")
		.update({ ...accountClientFields(account), updated_at: new Date().toISOString() })
		.eq("id", account.client_id)
		.eq("company_id", account.company_id);
	if (error) logger.error("menu_account_client_sync_failed", { message: error.message });
}

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
			.select("id, name, phone, phone_normalized, rut")
			.eq("id", account.client_id)
			.eq("company_id", account.company_id)
			.maybeSingle();
		if (existing) {
			// Ficha de antes del cifrado o con un nombre viejo: se corrige al usarla.
			if (needsSealing(existing as ClientContactRow, account)) await syncMenuAccountClient(account);
			return String(existing.id);
		}
		// La ficha apunta a otro negocio o desapareció entre lecturas: se crea otra.
	}

	const { data: created, error: createError } = await supabaseAdmin
		.from("clients")
		.insert({
			company_id: account.company_id,
			...accountClientFields(account),
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
