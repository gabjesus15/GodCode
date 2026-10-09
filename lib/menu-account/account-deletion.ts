import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";

import { sendEmailCode, verifyEmailCode } from "./email-code";
import { menuAccountErrors } from "./errors";
import type { MenuClientAccountRow } from "./types";

/**
 * Nombre que queda en la ficha del negocio cuando la persona elimina su cuenta: el
 * negocio sigue viendo cuántos pedidos y cuánto vendió, pero ya no a quién.
 */
export const DELETED_CLIENT_NAME = "Cliente eliminado";

/** Manda al correo de la sesión el código que autoriza eliminar la cuenta. */
export async function sendAccountDeletionCode(account: MenuClientAccountRow): Promise<void> {
	await sendEmailCode(account.email, "email");
}

export type DeleteMenuAccountInput = {
	account: MenuClientAccountRow;
	authUserId: string;
	code: string;
};

/**
 * Elimina la cuenta de la persona en ESTE negocio (términos de la cuenta, sección 7).
 *
 * - Borra la cuenta, sus direcciones guardadas y las vinculaciones pendientes.
 * - La ficha de `clients` no se borra: los pedidos la referencian y el negocio debe
 *   conservar sus ventas. Se le quitan nombre, teléfono, documento y dirección.
 * - Los pedidos conservan su propia copia del contacto: son registros de venta del
 *   negocio y se guardan por el plazo legal.
 *
 * Como cambiar la contraseña, exige el código del correo: una sesión olvidada en un
 * equipo ajeno no basta para borrar la cuenta de nadie.
 *
 * Devuelve si la persona se quedó sin cuentas en ningún negocio: solo entonces hay que
 * borrar también su usuario de auth (`deleteMenuIdentity`), después de cerrar sesión.
 */
export async function deleteMenuAccount(input: DeleteMenuAccountInput): Promise<{ lastAccount: boolean }> {
	const { account, authUserId } = input;

	const user = await verifyEmailCode(account.email, input.code, "email");
	if (user.id !== authUserId) throw menuAccountErrors.invalidCode();

	// La fila de la cuenta va al final: si algo falla antes, la cuenta sigue en pie y
	// la ficha se rehace sola al usarla (`ensureMenuAccountClient`).
	if (account.client_id) {
		await mustSucceed(
			"addresses",
			supabaseAdmin
				.from("client_addresses")
				.delete()
				.eq("client_id", account.client_id)
				.eq("company_id", account.company_id),
		);
		await mustSucceed(
			"client",
			supabaseAdmin
				.from("clients")
				.update({
					name: DELETED_CLIENT_NAME,
					phone: "",
					phone_normalized: null,
					rut: null,
					default_delivery_address: null,
					updated_at: new Date().toISOString(),
				})
				.eq("id", account.client_id)
				.eq("company_id", account.company_id),
		);
	}

	await mustSucceed(
		"link_requests",
		supabaseAdmin
			.from("menu_client_link_requests")
			.delete()
			.eq("auth_user_id", authUserId)
			.eq("company_id", account.company_id),
	);
	await mustSucceed(
		"account",
		supabaseAdmin
			.from("menu_client_accounts")
			.delete()
			.eq("id", account.id)
			.eq("company_id", account.company_id),
	);

	const { count, error } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("id", { count: "exact", head: true })
		.eq("auth_user_id", authUserId);
	if (error) {
		// Ante la duda se conserva el usuario: borrarlo dejaría sin acceso las cuentas
		// que la persona tenga en otros negocios.
		logger.error("menu_account_delete_count_failed", { message: error.message });
		return { lastAccount: false };
	}
	return { lastAccount: (count ?? 0) === 0 };
}

/**
 * Borra el usuario de auth de una persona que ya no tiene cuentas en ningún negocio.
 * Solo toca usuarios creados como clientes del menú, nunca uno del equipo.
 */
export async function deleteMenuIdentity(authUserId: string): Promise<void> {
	const { data } = await supabaseAdmin.auth.admin.getUserById(authUserId);
	const kind = (data?.user?.app_metadata as { kind?: unknown } | undefined)?.kind;
	if (kind !== "menu_client") {
		logger.warn("menu_account_identity_not_menu_client", { authUserId });
		return;
	}
	const { error } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
	// La cuenta ya no existe: un usuario de auth huérfano no da acceso a nada, así que
	// el fallo se registra pero no se reporta como error a la persona.
	if (error) logger.error("menu_account_identity_delete_failed", { authUserId, message: error.message });
}

async function mustSucceed(
	step: string,
	query: PromiseLike<{ error: { message: string } | null }>,
): Promise<void> {
	const { error } = await query;
	if (error) {
		logger.error("menu_account_delete_failed", { step, message: error.message });
		throw menuAccountErrors.internal();
	}
}
