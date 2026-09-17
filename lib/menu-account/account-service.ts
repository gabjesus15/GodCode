import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";
import { logger } from "@/lib/infra/logger";
import { normalizeDocument } from "@/lib/geo/document-normalize";

import {
	documentLookupValues,
	isLegacyAccountRow,
	openAccountRow,
	readAccountEmail,
	sealAccountFields,
	upgradeLegacyAccountRow,
} from "./account-records";
import { createMenuClientResponseClient } from "./cookies";
import { assertBranchBelongsToCompany, type MenuAccountCompany } from "./company-resolve";
import { menuAccountErrors, MenuAccountError } from "./errors";
import { classifyEmail, normalizeEmail } from "./identity-guard";
import { sealPii } from "./pii";
import { toMenuAccountDto } from "./session";
import type { MenuAccountDto, MenuClientAccountRow } from "./types";

/** Solo dígitos, para poder comparar teléfonos escritos de mil formas. */
function normalizePhoneDigits(raw: string | null | undefined): string | null {
	const digits = String(raw ?? "").replace(/\D/g, "");
	return digits.length > 0 ? digits : null;
}

function isDuplicateKey(error: { code?: string } | null | undefined): boolean {
	return error?.code === "23505";
}

/** Supabase no expone un código estable para "correo ya registrado"; se detecta por mensaje. */
function isEmailAlreadyRegistered(message: string | null | undefined): boolean {
	const text = String(message ?? "").toLowerCase();
	return (
		text.includes("already registered") ||
		text.includes("already been registered") ||
		text.includes("email_exists") ||
		text.includes("user already exists")
	);
}

export type RegisterMenuAccountInput = {
	company: MenuAccountCompany;
	document: string;
	email: string;
	password: string;
	fullName: string;
	phone: string;
	preferredBranchId?: string | null;
};

export type RegisterMenuAccountResult =
	| { status: "created"; account: MenuAccountDto }
	| { status: "linked"; account: MenuAccountDto };

/**
 * Alta de cuenta, o vinculación de este negocio si el correo ya es de un cliente.
 *
 * El orden importa: se reserva la fila ANTES de crear el usuario de auth, porque el
 * índice único `(company_id, document_normalized)` es el único guardia real contra
 * dos altas simultáneas del mismo documento. Esa columna guarda la huella HMAC del
 * documento, así que el índice sigue funcionando sin que el dato quede legible.
 */
export async function registerMenuAccount(
	input: RegisterMenuAccountInput,
	request: NextRequest,
	response: NextResponse,
): Promise<RegisterMenuAccountResult> {
	const { company } = input;

	const documentResult = normalizeDocument(input.document, company.countryCode);
	if (!documentResult.ok) {
		throw documentResult.reason === "blocked"
			? menuAccountErrors.blockedDocument()
			: menuAccountErrors.invalidDocument();
	}

	const preferredBranchId = await assertBranchBelongsToCompany(
		input.preferredBranchId,
		company.id,
	);

	const email = normalizeEmail(input.email);
	const phoneNormalized = normalizePhoneDigits(input.phone);
	const ownership = await classifyEmail(email);

	if (ownership.ownership === "staff") throw menuAccountErrors.emailBelongsToStaff();
	if (ownership.ownership === "foreign") throw menuAccountErrors.emailUnavailable();

	await assertDocumentFree(company.id, documentResult.normalized);

	const shared = {
		company_id: company.id,
		document_country: documentResult.country,
		preferred_branch_id: preferredBranchId,
		...sealAccountFields({
			email,
			documentNormalized: documentResult.normalized,
			documentRaw: input.document.trim(),
			fullName: input.fullName,
			phone: input.phone,
			phoneNormalized,
		}),
	};

	if (ownership.ownership === "menu_client" && ownership.authUserId) {
		const account = await linkExistingMenuClient({
			authUserId: ownership.authUserId,
			email,
			shared,
			company,
			password: input.password,
			request,
			response,
		});
		return { status: "linked", account };
	}

	// --- Alta normal -------------------------------------------------------
	const { data: reserved, error: reserveError } = await supabaseAdmin
		.from("menu_client_accounts")
		.insert({ ...shared, auth_user_id: null })
		.select("id")
		.single();

	if (reserveError || !reserved) {
		if (isDuplicateKey(reserveError)) throw menuAccountErrors.documentTaken();
		logger.error("menu_account_reserve_failed", { message: reserveError?.message });
		throw menuAccountErrors.internal();
	}

	const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
		email,
		password: input.password,
		email_confirm: true,
		app_metadata: { kind: "menu_client" },
		// Sin nombre en los metadatos: `auth.users` no está cifrado.
	});

	if (createError || !created?.user?.id) {
		await supabaseAdmin.from("menu_client_accounts").delete().eq("id", reserved.id);
		// Red de seguridad: si `classifyEmail` no vio el correo (p. ej. existe en
		// auth.users pero en ninguna de nuestras tablas), este es el guardia real.
		if (isEmailAlreadyRegistered(createError?.message)) {
			throw menuAccountErrors.emailUnavailable();
		}
		logger.error("menu_account_create_user_failed", { message: createError?.message });
		throw menuAccountErrors.internal();
	}

	const authUserId = created.user.id;

	const { data: linked, error: linkError } = await supabaseAdmin
		.from("menu_client_accounts")
		.update({ auth_user_id: authUserId })
		.eq("id", reserved.id)
		.select("*")
		.single();

	if (linkError || !linked) {
		// Compensación: sin este borrado quedaría un usuario de auth sin cuenta, y ese
		// correo no podría volver a registrarse nunca.
		const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
		await supabaseAdmin.from("menu_client_accounts").delete().eq("id", reserved.id);
		if (deleteError) {
			logger.error("menu_account_orphan_auth_user", { authUserId, message: deleteError.message });
		}
		if (isDuplicateKey(linkError)) throw menuAccountErrors.alreadyRegistered();
		throw menuAccountErrors.internal();
	}

	await signInOnResponse(request, response, email, input.password);
	await touchLastLogin(linked.id);

	return {
		status: "created",
		account: toMenuAccountDto(openAccountRow(linked as MenuClientAccountRow, email)),
	};
}

type LinkExistingMenuClientInput = {
	authUserId: string;
	/** Correo en claro para iniciar sesión; `shared.email` es solo su huella. */
	email: string;
	shared: {
		company_id: string;
		email: string;
		document_normalized: string;
	} & Record<string, unknown>;
	company: MenuAccountCompany;
	password: string;
	request: NextRequest;
	response: NextResponse;
};

/**
 * El correo ya es de un cliente de otro negocio: se vincula este negocio a esa misma
 * persona si la contraseña tecleada es la de su cuenta.
 *
 * Conocer la contraseña es la prueba de que es la misma persona; sin ella, cualquiera
 * que supiera un correo ajeno podría colgarse de esa identidad. Nunca se cambia la
 * contraseña existente: si no coincide, se rechaza.
 */
async function linkExistingMenuClient(input: LinkExistingMenuClientInput): Promise<MenuAccountDto> {
	const { authUserId, shared, company } = input;

	const { data: existingAccount } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("id")
		.eq("company_id", company.id)
		.eq("auth_user_id", authUserId)
		.maybeSingle();
	if (existingAccount) throw menuAccountErrors.alreadyRegistered();

	// Verifica la contraseña y, si es correcta, deja la sesión puesta en la respuesta.
	const supabase = createMenuClientResponseClient(input.request, input.response);
	const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
		email: input.email,
		password: input.password,
	});
	if (signInError || signIn?.user?.id !== authUserId) {
		if (signInError) logger.warn("menu_account_link_sign_in_failed", { message: signInError.message });
		throw menuAccountErrors.linkPasswordMismatch();
	}

	const { data: linked, error: insertError } = await supabaseAdmin
		.from("menu_client_accounts")
		.insert({ ...shared, auth_user_id: authUserId })
		.select("*")
		.single();

	if (insertError || !linked) {
		if (isDuplicateKey(insertError)) throw menuAccountErrors.documentTaken();
		logger.error("menu_account_link_insert_failed", { message: insertError?.message });
		throw menuAccountErrors.internal();
	}

	await touchLastLogin(linked.id);
	return toMenuAccountDto(openAccountRow(linked as MenuClientAccountRow, input.email));
}

export type LoginMenuAccountInput = {
	company: MenuAccountCompany;
	document: string;
	password: string;
};

export async function loginMenuAccount(
	input: LoginMenuAccountInput,
	request: NextRequest,
	response: NextResponse,
): Promise<MenuAccountDto> {
	const documentResult = normalizeDocument(input.document, input.company.countryCode);
	// Documento mal formado y cuenta inexistente devuelven lo mismo: no se filtra
	// qué documentos existen en este negocio.
	if (!documentResult.ok) throw menuAccountErrors.invalidCredentials();

	const { data: rows } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("*")
		.eq("company_id", input.company.id)
		.in("document_normalized", documentLookupValues(documentResult.normalized))
		.limit(1);
	const account = (rows?.[0] ?? null) as MenuClientAccountRow | null;

	if (!account || account.is_active === false || !account.auth_user_id) {
		throw menuAccountErrors.invalidCredentials();
	}

	const email = await readAccountEmail(account);
	if (!email) throw menuAccountErrors.invalidCredentials();

	await signInOnResponse(request, response, email, input.password);
	await touchLastLogin(account.id);
	if (isLegacyAccountRow(account)) await upgradeLegacyAccountRow(account);

	return toMenuAccountDto(openAccountRow(account, email));
}

async function signInOnResponse(
	request: NextRequest,
	response: NextResponse,
	email: string,
	password: string,
): Promise<void> {
	const supabase = createMenuClientResponseClient(request, response);
	const { error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) {
		// El detalle se queda en el log; al navegador va siempre el error genérico.
		logger.warn("menu_account_sign_in_failed", { message: error.message });
		throw menuAccountErrors.invalidCredentials();
	}
}

/**
 * El índice único solo ve huellas: una cuenta antigua aún sin cifrar con el mismo
 * documento no chocaría con él, así que se comprueba también el valor en claro.
 */
async function assertDocumentFree(companyId: string, documentNormalized: string): Promise<void> {
	const { data } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("id")
		.eq("company_id", companyId)
		.in("document_normalized", documentLookupValues(documentNormalized))
		.limit(1);
	if (data && data.length > 0) throw menuAccountErrors.documentTaken();
}

async function touchLastLogin(accountId: string): Promise<void> {
	await supabaseAdmin
		.from("menu_client_accounts")
		.update({ last_login_at: new Date().toISOString() })
		.eq("id", accountId);
}

export type UpdateProfileInput = {
	accountId: string;
	companyId: string;
	/** Correo en claro de la sesión, para devolver la cuenta descifrada. */
	email: string;
	fullName?: string;
	phone?: string;
	preferredBranchId?: string | null;
};

export async function updateMenuAccountProfile(
	input: UpdateProfileInput,
): Promise<MenuAccountDto> {
	const patch: Record<string, unknown> = {};

	if (input.fullName !== undefined) patch.full_name = sealPii(input.fullName);
	if (input.phone !== undefined) {
		patch.phone = sealPii(input.phone);
		patch.phone_normalized = sealPii(normalizePhoneDigits(input.phone));
	}
	if (input.preferredBranchId !== undefined) {
		patch.preferred_branch_id = await assertBranchBelongsToCompany(
			input.preferredBranchId,
			input.companyId,
		);
	}

	if (Object.keys(patch).length === 0) {
		const { data } = await supabaseAdmin
			.from("menu_client_accounts")
			.select("*")
			.eq("id", input.accountId)
			.single();
		return toMenuAccountDto(openAccountRow(data as MenuClientAccountRow, input.email));
	}

	const { data, error } = await supabaseAdmin
		.from("menu_client_accounts")
		.update(patch)
		// El filtro por company además del id evita que un id de otro negocio se cuele.
		.eq("id", input.accountId)
		.eq("company_id", input.companyId)
		.select("*")
		.single();

	if (error || !data) throw menuAccountErrors.internal();
	return toMenuAccountDto(openAccountRow(data as MenuClientAccountRow, input.email));
}

export type ChangePasswordInput = {
	account: MenuClientAccountRow;
	authUserId: string;
	currentPassword: string;
	newPassword: string;
};

/**
 * Cambia la contraseña exigiendo siempre la actual. No hay recuperación por correo,
 * así que no existe otra forma de probar que quien cambia la clave es el dueño.
 */
export async function changeMenuAccountPassword(input: ChangePasswordInput): Promise<void> {
	// Verificación con un cliente efímero: no debe tocar las cookies de la sesión.
	const ephemeral = createSupabasePublicServerClient();
	const { error } = await ephemeral.auth.signInWithPassword({
		email: input.account.email,
		password: input.currentPassword,
	});
	if (error) throw menuAccountErrors.invalidCredentials();
	await ephemeral.auth.signOut();

	const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(input.authUserId, {
		password: input.newPassword,
	});
	if (updateError) {
		logger.error("menu_account_password_update_failed", { message: updateError.message });
		throw menuAccountErrors.internal();
	}
}

export { MenuAccountError };
