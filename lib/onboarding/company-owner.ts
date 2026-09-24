import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { normalizeEmail } from "./trial-eligibility";

export type EnsureCompanyOwnerResult =
	| { ok: true; authUserId: string; created: boolean }
	| { ok: false; error: string };

function isAlreadyRegisteredError(message: string | undefined): boolean {
	const text = String(message ?? "").toLowerCase();
	return text.includes("already") || text.includes("registered") || text.includes("exists");
}

/**
 * Deja al dueño de una empresa con acceso a /cuenta: usuario de Auth (se crea, o se
 * reutiliza si ese correo ya tenía cuenta, p. ej. dueño de otro local) y fila `users`
 * con rol `ceo` en la empresa. Idempotente: si ya estaba dado de alta no hace nada.
 *
 * El usuario nuevo nace sin contraseña conocida: entra con el enlace de "crear
 * contraseña" que le llega en el correo de bienvenida.
 */
export async function ensureCompanyOwner(
	supabaseAdmin: SupabaseClient,
	params: { companyId: string; email: string; fullName?: string | null },
): Promise<EnsureCompanyOwnerResult> {
	const email = normalizeEmail(params.email);
	if (!email) return { ok: false, error: "La solicitud no tiene correo" };

	const { data: existingRow } = await supabaseAdmin
		.from("users")
		.select("id,auth_user_id")
		.eq("company_id", params.companyId)
		.eq("email", email)
		.maybeSingle();

	if (existingRow?.auth_user_id) {
		return { ok: true, authUserId: String(existingRow.auth_user_id), created: false };
	}

	let authUserId: string | null = null;
	let createdAuthUser = false;

	const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
		email,
		password: randomBytes(24).toString("base64url"),
		email_confirm: true,
	});

	if (created?.user?.id) {
		authUserId = created.user.id;
		createdAuthUser = true;
	} else if (isAlreadyRegisteredError(createError?.message)) {
		// El correo ya tiene cuenta: generar un enlace devuelve el usuario sin enviar nada.
		const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
		authUserId = linkData?.user?.id ?? null;
	}

	if (!authUserId) {
		return { ok: false, error: createError?.message || "No se pudo crear el usuario del dueño" };
	}

	const { error: rowError } = existingRow?.id
		? await supabaseAdmin
				.from("users")
				.update({ auth_user_id: authUserId, auth_id: authUserId, is_active: true })
				.eq("id", existingRow.id)
		: await supabaseAdmin.from("users").insert({
				email,
				role: "ceo",
				company_id: params.companyId,
				branch_id: null,
				full_name: params.fullName?.trim() || null,
				auth_user_id: authUserId,
				auth_id: authUserId,
				is_active: true,
			});

	if (rowError) {
		// Sin fila `users` la cuenta no sirve para nada: no dejar un login huérfano que
		// haga fallar el reintento con "ya registrado".
		if (createdAuthUser) await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => undefined);
		return { ok: false, error: rowError.message || "No se pudo vincular al dueño con la empresa" };
	}

	return { ok: true, authUserId, created: createdAuthUser };
}
