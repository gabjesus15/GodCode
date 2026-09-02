import "server-only";

import type { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";
import { logger } from "@/lib/infra/logger";
import { normalizeDocument } from "@/lib/geo/document-normalize";

import { createMenuClientResponseClient } from "./cookies";
import { assertBranchBelongsToCompany, type MenuAccountCompany } from "./company-resolve";
import { menuAccountErrors, MenuAccountError } from "./errors";
import { classifyEmail, normalizeEmail } from "./identity-guard";
import { toMenuAccountDto } from "./session";
import type { MenuAccountDto, MenuClientAccountRow } from "./types";

/** Duración de la solicitud de vinculación pendiente de confirmar por correo. */
const LINK_REQUEST_TTL_MS = 60 * 60 * 1000;
/** Ventana para fijar contraseña sin conocer la anterior, tras canjear el enlace. */
const RESET_GRANT_TTL_MS = 15 * 60 * 1000;

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
	origin: string;
};

export type RegisterMenuAccountResult =
	| { status: "created"; account: MenuAccountDto }
	| { status: "link_email_sent" };

/**
 * Alta de cuenta, o solicitud de vinculación si el correo ya es de un cliente.
 *
 * El orden importa: se reserva la fila ANTES de crear el usuario de auth, porque el
 * índice único `(company_id, document_normalized)` es el único guardia real contra
 * dos altas simultáneas del mismo documento.
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

	const shared = {
		company_id: company.id,
		email,
		document_normalized: documentResult.normalized,
		document_raw: input.document.trim(),
		document_country: documentResult.country,
		full_name: input.fullName,
		phone: input.phone,
		phone_normalized: phoneNormalized,
		preferred_branch_id: preferredBranchId,
	};

	if (ownership.ownership === "menu_client" && ownership.authUserId) {
		await createLinkRequest({
			authUserId: ownership.authUserId,
			shared,
			company,
			origin: input.origin,
		});
		return { status: "link_email_sent" };
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
		user_metadata: { full_name: input.fullName },
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

	return { status: "created", account: toMenuAccountDto(linked as MenuClientAccountRow) };
}

type CreateLinkRequestInput = {
	authUserId: string;
	shared: Record<string, unknown>;
	company: MenuAccountCompany;
	origin: string;
};

/**
 * Guarda la solicitud y dispara el magic link. La contraseña tecleada se descarta a
 * propósito: la cuenta vinculada conserva la suya, o vincular sería una forma de
 * cambiar la contraseña sin conocer la anterior.
 */
async function createLinkRequest(input: CreateLinkRequestInput): Promise<void> {
	const { authUserId, shared, company, origin } = input;

	const { data: existingAccount } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("id")
		.eq("company_id", company.id)
		.eq("auth_user_id", authUserId)
		.maybeSingle();
	if (existingAccount) throw menuAccountErrors.alreadyRegistered();

	const { data: takenDocument } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("id")
		.eq("company_id", company.id)
		.eq("document_normalized", String(shared.document_normalized))
		.maybeSingle();
	if (takenDocument) throw menuAccountErrors.documentTaken();

	const { data: linkRequest, error: linkRequestError } = await supabaseAdmin
		.from("menu_client_link_requests")
		.insert({
			...shared,
			auth_user_id: authUserId,
			expires_at: new Date(Date.now() + LINK_REQUEST_TTL_MS).toISOString(),
		})
		.select("id")
		.single();

	if (linkRequestError || !linkRequest) {
		logger.error("menu_account_link_request_failed", { message: linkRequestError?.message });
		throw menuAccountErrors.internal();
	}

	const redirectTo = `${origin}/api/menu-account/confirm?company=${encodeURIComponent(
		company.publicSlug,
	)}&link=${encodeURIComponent(linkRequest.id)}`;

	const supabase = createSupabasePublicServerClient();
	const { error: otpError } = await supabase.auth.signInWithOtp({
		email: String(shared.email),
		options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
	});

	if (otpError) {
		await supabaseAdmin.from("menu_client_link_requests").delete().eq("id", linkRequest.id);
		logger.error("menu_account_link_email_failed", { message: otpError.message });
		throw menuAccountErrors.internal();
	}
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

	const { data: account } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("*")
		.eq("company_id", input.company.id)
		.eq("document_normalized", documentResult.normalized)
		.maybeSingle();

	if (!account || account.is_active === false || !account.auth_user_id) {
		throw menuAccountErrors.invalidCredentials();
	}

	await signInOnResponse(request, response, account.email, input.password);
	await touchLastLogin(account.id);

	return toMenuAccountDto(account as MenuClientAccountRow);
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

async function touchLastLogin(accountId: string): Promise<void> {
	await supabaseAdmin
		.from("menu_client_accounts")
		.update({ last_login_at: new Date().toISOString() })
		.eq("id", accountId);
}

export type UpdateProfileInput = {
	accountId: string;
	companyId: string;
	fullName?: string;
	phone?: string;
	preferredBranchId?: string | null;
};

export async function updateMenuAccountProfile(
	input: UpdateProfileInput,
): Promise<MenuAccountDto> {
	const patch: Record<string, unknown> = {};

	if (input.fullName !== undefined) patch.full_name = input.fullName;
	if (input.phone !== undefined) {
		patch.phone = input.phone;
		patch.phone_normalized = normalizePhoneDigits(input.phone);
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
		return toMenuAccountDto(data as MenuClientAccountRow);
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
	return toMenuAccountDto(data as MenuClientAccountRow);
}

export type ChangePasswordInput = {
	account: MenuClientAccountRow;
	authUserId: string;
	currentPassword?: string | null;
	newPassword: string;
};

export async function changeMenuAccountPassword(input: ChangePasswordInput): Promise<void> {
	const grantExpiresAt = input.account.reset_grant_expires_at
		? new Date(input.account.reset_grant_expires_at).getTime()
		: null;
	const hasGrant = grantExpiresAt !== null && grantExpiresAt > Date.now();

	if (!hasGrant) {
		if (!input.currentPassword) throw menuAccountErrors.resetRequired();
		// Verificación con un cliente efímero: no debe tocar las cookies de la sesión.
		const ephemeral = createSupabasePublicServerClient();
		const { error } = await ephemeral.auth.signInWithPassword({
			email: input.account.email,
			password: input.currentPassword,
		});
		if (error) throw menuAccountErrors.invalidCredentials();
		await ephemeral.auth.signOut();
	}

	const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(input.authUserId, {
		password: input.newPassword,
	});
	if (updateError) {
		logger.error("menu_account_password_update_failed", { message: updateError.message });
		throw menuAccountErrors.internal();
	}

	// El grant es de un solo uso: se consume aunque no se haya usado en esta llamada.
	await supabaseAdmin
		.from("menu_client_accounts")
		.update({ reset_grant_expires_at: null })
		.eq("auth_user_id", input.authUserId);
}

/**
 * Dispara el correo de recuperación. Quien llama debe responder siempre lo mismo,
 * exista o no la cuenta, para no convertir esto en un oráculo de documentos.
 */
export async function requestPasswordReset(params: {
	company: MenuAccountCompany;
	document: string;
	origin: string;
}): Promise<void> {
	const documentResult = normalizeDocument(params.document, params.company.countryCode);
	if (!documentResult.ok) return;

	const { data: account } = await supabaseAdmin
		.from("menu_client_accounts")
		.select("email, is_active")
		.eq("company_id", params.company.id)
		.eq("document_normalized", documentResult.normalized)
		.maybeSingle();

	if (!account || account.is_active === false) return;

	const redirectTo = `${params.origin}/api/menu-account/confirm?company=${encodeURIComponent(
		params.company.publicSlug,
	)}`;

	const supabase = createSupabasePublicServerClient();
	const { error } = await supabase.auth.resetPasswordForEmail(account.email, { redirectTo });
	if (error) {
		logger.warn("menu_account_reset_email_failed", { message: error.message });
	}
}

/** Marca la ventana que permite fijar contraseña sin conocer la anterior. */
export async function grantPasswordReset(authUserId: string): Promise<void> {
	await supabaseAdmin
		.from("menu_client_accounts")
		.update({
			reset_grant_expires_at: new Date(Date.now() + RESET_GRANT_TTL_MS).toISOString(),
		})
		.eq("auth_user_id", authUserId);
}

/**
 * Convierte una solicitud de vinculación confirmada en una cuenta real.
 *
 * `sessionAuthUserId` viene de la sesión que acaba de crear `verifyOtp`, no de la
 * URL: es lo que impide que alguien confirme la solicitud de otra persona.
 */
export async function consumeLinkRequest(
	linkRequestId: string,
	sessionAuthUserId: string,
): Promise<{ companySlug: string | null }> {
	const { data: linkRequest } = await supabaseAdmin
		.from("menu_client_link_requests")
		.select("*")
		.eq("id", linkRequestId)
		.maybeSingle();

	if (!linkRequest) throw menuAccountErrors.linkInvalid();
	if (linkRequest.consumed_at) throw menuAccountErrors.linkInvalid();
	if (new Date(linkRequest.expires_at).getTime() <= Date.now()) {
		throw menuAccountErrors.linkInvalid();
	}
	if (String(linkRequest.auth_user_id) !== sessionAuthUserId) {
		logger.warn("menu_account_link_owner_mismatch", { linkRequestId });
		throw menuAccountErrors.linkInvalid();
	}

	const { error: insertError } = await supabaseAdmin.from("menu_client_accounts").insert({
		company_id: linkRequest.company_id,
		auth_user_id: linkRequest.auth_user_id,
		email: linkRequest.email,
		document_normalized: linkRequest.document_normalized,
		document_raw: linkRequest.document_raw,
		document_country: linkRequest.document_country,
		full_name: linkRequest.full_name,
		phone: linkRequest.phone,
		phone_normalized: linkRequest.phone_normalized,
		preferred_branch_id: linkRequest.preferred_branch_id,
	});

	if (insertError && !isDuplicateKey(insertError)) {
		logger.error("menu_account_link_insert_failed", { message: insertError.message });
		throw menuAccountErrors.internal();
	}

	await supabaseAdmin
		.from("menu_client_link_requests")
		.update({ consumed_at: new Date().toISOString() })
		.eq("id", linkRequestId);

	const { data: company } = await supabaseAdmin
		.from("companies")
		.select("public_slug")
		.eq("id", linkRequest.company_id)
		.maybeSingle();

	return { companySlug: company?.public_slug ?? null };
}

export { MenuAccountError };
