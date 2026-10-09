import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_OWNER_PASSWORD_LENGTH, MIN_OWNER_PASSWORD_LENGTH } from "./owner-password-rules";
import { normalizeEmail } from "./trial-eligibility";

export type OwnerFirstPasswordResult = { ok: true; email: string } | { ok: false; error: string; status: number };

/**
 * Primera contraseña del dueño desde la página de éxito del pago, para que entre a su
 * cuenta en el acto sin ir a buscar el correo de bienvenida.
 *
 * La credencial es la misma que la del resto del alta: el token de la solicitud (que solo
 * tiene quien abrió el enlace del correo) junto con la referencia del pago. Solo sirve
 * para una cuenta recién creada que nunca entró: no puede cambiar la contraseña de alguien
 * que ya usa su cuenta (p. ej. el dueño de otro local con el mismo correo).
 */
export async function setOwnerFirstPassword(
	supabaseAdmin: SupabaseClient,
	params: { paymentReference: string; verificationToken: string; password: string },
): Promise<OwnerFirstPasswordResult> {
	const password = params.password;
	if (password.length < MIN_OWNER_PASSWORD_LENGTH || password.length > MAX_OWNER_PASSWORD_LENGTH) {
		return { ok: false, error: `La contraseña debe tener entre ${MIN_OWNER_PASSWORD_LENGTH} y ${MAX_OWNER_PASSWORD_LENGTH} caracteres.`, status: 400 };
	}

	const { data: app } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,company_id,payment_status,verification_token")
		.eq("payment_reference", params.paymentReference)
		.maybeSingle();
	if (!app || String(app.verification_token ?? "") !== params.verificationToken) {
		return { ok: false, error: "No encontramos tu alta. Usa el enlace del correo de bienvenida.", status: 404 };
	}
	if (String(app.payment_status ?? "") !== "paid" || !app.company_id) {
		return { ok: false, error: "Tu cuenta todavía se está creando. Intenta de nuevo en unos segundos.", status: 409 };
	}

	const email = normalizeEmail(String(app.email ?? ""));
	const { data: owner } = await supabaseAdmin
		.from("users")
		.select("auth_user_id")
		.eq("company_id", app.company_id)
		.eq("email", email)
		.eq("role", "ceo")
		.maybeSingle();
	const authUserId = String(owner?.auth_user_id ?? "");
	if (!authUserId) {
		return { ok: false, error: "Tu cuenta todavía se está creando. Intenta de nuevo en unos segundos.", status: 409 };
	}

	const { data: authUser, error: readError } = await supabaseAdmin.auth.admin.getUserById(authUserId);
	if (readError || !authUser?.user) {
		return { ok: false, error: "No pudimos preparar tu acceso. Usa el enlace del correo de bienvenida.", status: 500 };
	}
	if (authUser.user.last_sign_in_at) {
		return { ok: false, error: "Esta cuenta ya tiene contraseña. Entra con ella o pide un enlace nuevo.", status: 409 };
	}

	const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
	if (updateError) {
		return { ok: false, error: "No pudimos guardar la contraseña. Intenta con otra.", status: 400 };
	}
	return { ok: true, email };
}
