import "server-only";

import type { User } from "@supabase/supabase-js";
import type { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { logger } from "@/lib/infra/logger";
import { createSupabasePublicServerClient } from "@/utils/supabase/server";

import { createMenuClientResponseClient } from "./cookies";
import { menuAccountErrors } from "./errors";

/**
 * Códigos de 6 dígitos por correo, generados y validados por Supabase Auth.
 *
 * - `email`: confirmar el correo al registrarse y autorizar el cambio de contraseña.
 *   Sale con la plantilla `magic_link` de GoTrue.
 * - `recovery`: recuperar la contraseña olvidada. Sale con la plantilla `recovery`.
 *
 * Las plantillas del servidor muestran `{{ .Token }}` en vez de un enlace: el código
 * se escribe en la misma pantalla y nunca hace falta volver desde el correo.
 */
export type EmailCodePurpose = "email" | "recovery";

/**
 * Marca de "correo verificado". Va en `app_metadata` del usuario de auth, no en la
 * cuenta del negocio: el usuario es el mismo en todos los negocios donde la persona
 * tiene cuenta, y el correo solo hay que probarlo una vez.
 */
const VERIFIED_KEY = "menu_email_verified_at";

export function isMenuEmailVerified(user: Pick<User, "app_metadata"> | null | undefined): boolean {
	const value = (user?.app_metadata as Record<string, unknown> | undefined)?.[VERIFIED_KEY];
	return typeof value === "string" && value.length > 0;
}

export async function markMenuEmailVerified(user: Pick<User, "id" | "app_metadata">): Promise<void> {
	const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
		// Se manda completo para no depender de si GoTrue fusiona o reemplaza: `kind` se conserva.
		app_metadata: { ...(user.app_metadata ?? {}), [VERIFIED_KEY]: new Date().toISOString() },
	});
	if (error) {
		logger.error("menu_account_mark_verified_failed", { message: error.message });
		throw menuAccountErrors.internal();
	}
}

/** Envía un código al correo. Un fallo del proveedor se loguea y se reporta como interno. */
export async function sendEmailCode(email: string, purpose: EmailCodePurpose): Promise<void> {
	const supabase = createSupabasePublicServerClient();
	const { error } =
		purpose === "recovery"
			? await supabase.auth.resetPasswordForEmail(email)
			: await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
	if (error) {
		logger.error("menu_account_send_code_failed", { purpose, message: error.message });
		throw menuAccountErrors.internal();
	}
}

/**
 * Valida el código sin tocar las cookies: la sesión que crea GoTrue al validar se
 * cierra enseguida. Sirve cuando el código solo autoriza una acción (cambiar la clave).
 */
export async function verifyEmailCode(
	email: string,
	code: string,
	purpose: EmailCodePurpose,
): Promise<User> {
	const ephemeral = createSupabasePublicServerClient();
	const { data, error } = await ephemeral.auth.verifyOtp({ email, token: code, type: purpose });
	if (error || !data?.user) {
		if (error) logger.warn("menu_account_verify_code_failed", { purpose, message: error.message });
		throw menuAccountErrors.invalidCode();
	}
	await ephemeral.auth.signOut().catch(() => undefined);
	return data.user;
}

/** Valida el código y deja la sesión del cliente puesta en `response`. */
export async function verifyEmailCodeAndSignIn(
	email: string,
	code: string,
	request: NextRequest,
	response: NextResponse,
): Promise<User> {
	const supabase = createMenuClientResponseClient(request, response);
	const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
	if (error || !data?.user) {
		if (error) logger.warn("menu_account_verify_code_failed", { purpose: "email", message: error.message });
		throw menuAccountErrors.invalidCode();
	}
	return data.user;
}
