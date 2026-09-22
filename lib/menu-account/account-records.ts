import "server-only";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";
import { normalizeDocument } from "@/lib/geo/document-normalize";

import { isLookupHash, isSealedPii, lookupHash, openPii, sealPii } from "./pii";
import type { MenuClientAccountRow } from "./types";

/**
 * Traducción entre la fila cifrada de `menu_client_accounts` y la forma en claro que
 * usa el resto del código.
 *
 * En la base:
 * - `document_normalized` y `email` guardan la huella HMAC (`lookupHash`), no el dato.
 *   Siguen sirviendo para el login por documento, el índice único y detectar un correo
 *   ya registrado. El correo real vive en `auth.users`, que Supabase Auth necesita.
 * - `document_raw`, `full_name`, `phone` y `phone_normalized` van cifrados (`sealPii`).
 *
 * Fuera de este módulo nadie debería leer esas columnas directamente de la base.
 */

export type AccountPlainFields = {
	email: string;
	documentNormalized: string;
	documentRaw: string;
	fullName: string;
	phone: string;
	phoneNormalized: string | null;
};

/** Columnas listas para insertar o actualizar, ya cifradas. */
export function sealAccountFields(fields: AccountPlainFields) {
	return {
		email: lookupHash("email", fields.email),
		document_normalized: lookupHash("document", fields.documentNormalized),
		document_raw: sealPii(fields.documentRaw),
		full_name: sealPii(fields.fullName),
		phone: sealPii(fields.phone),
		phone_normalized: sealPii(fields.phoneNormalized),
	};
}

/**
 * Valores para buscar por documento: la huella y, mientras queden cuentas antiguas sin
 * cifrar, también el valor en claro.
 */
export function documentLookupValues(documentNormalized: string): string[] {
	return [lookupHash("document", documentNormalized), documentNormalized];
}

export function emailLookupValues(email: string): string[] {
	return [lookupHash("email", email), email];
}

/** Cuenta creada antes del cifrado: el documento todavía está en claro. */
export function isLegacyAccountRow(row: Pick<MenuClientAccountRow, "document_normalized">): boolean {
	return !isLookupHash(row.document_normalized);
}

/**
 * Descifra la fila. `email` llega aparte porque en la base solo está su huella: sale
 * de la sesión de Supabase Auth o de `auth.admin.getUserById`.
 */
export function openAccountRow(row: MenuClientAccountRow, email: string): MenuClientAccountRow {
	if (isLegacyAccountRow(row)) {
		return { ...row, email: row.email.includes("@") ? row.email : email };
	}

	const documentRaw = openPii(row.document_raw) ?? "";
	const normalized = normalizeDocument(documentRaw, row.document_country);
	return {
		...row,
		email,
		document_raw: documentRaw,
		// La huella no se puede revertir: se recalcula desde el documento descifrado.
		document_normalized: normalized.ok ? normalized.normalized : documentRaw,
		full_name: openPii(row.full_name) ?? "",
		phone: openPii(row.phone) ?? "",
		phone_normalized: openPii(row.phone_normalized),
	};
}

/**
 * Cifra en su sitio una cuenta antigua. Es condicional sobre el documento leído, así
 * que dos peticiones a la vez no cifran dos veces ni pisan un cambio posterior.
 * Si falla no rompe la petición: la cuenta sigue funcionando y se reintenta luego.
 */
export async function upgradeLegacyAccountRow(row: MenuClientAccountRow): Promise<void> {
	if (!isLegacyAccountRow(row)) return;

	const documentRaw = row.document_raw ?? row.document_normalized;
	const patch = {
		email: row.email.includes("@") ? lookupHash("email", row.email) : row.email,
		document_normalized: lookupHash("document", row.document_normalized),
		document_raw: isSealedPii(documentRaw) ? documentRaw : sealPii(documentRaw),
		full_name: sealPii(row.full_name),
		phone: sealPii(row.phone),
		phone_normalized: sealPii(row.phone_normalized),
	};

	const { error } = await supabaseAdmin
		.from("menu_client_accounts")
		.update(patch)
		.eq("id", row.id)
		.eq("document_normalized", row.document_normalized);
	if (error) {
		logger.warn("menu_account_pii_upgrade_failed", { accountId: row.id, message: error.message });
		return;
	}

	// El alta antigua copiaba el nombre a los metadatos de auth; ahí también quedaba legible.
	if (row.auth_user_id) {
		try {
			await supabaseAdmin.auth.admin.updateUserById(row.auth_user_id, {
				user_metadata: { full_name: null },
			});
		} catch (metadataError) {
			logger.warn("menu_account_pii_metadata_clear_failed", {
				accountId: row.id,
				message: metadataError instanceof Error ? metadataError.message : String(metadataError),
			});
		}
	}
}

/** Correo real de la cuenta, desde `auth.users`. */
export async function readAccountEmail(row: MenuClientAccountRow): Promise<string | null> {
	if (row.email.includes("@")) return row.email;
	if (!row.auth_user_id) return null;
	const { data, error } = await supabaseAdmin.auth.admin.getUserById(row.auth_user_id);
	if (error || !data?.user?.email) return null;
	return data.user.email;
}
