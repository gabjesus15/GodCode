import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { MAX_OWNER_PASSWORD_LENGTH, MIN_OWNER_PASSWORD_LENGTH } from "./owner-password-rules";
import { normalizeEmail } from "./trial-eligibility";

export type OwnerFirstPasswordResult = { ok: true; email: string } | { ok: false; error: string; status: number };

/** Desde el pago: después de esto la contraseña se crea con el enlace del correo. */
export const OWNER_FIRST_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const USED_OR_INVALID = "Este enlace ya se usó o no es válido. Entra con tu correo y tu contraseña, o pide un enlace nuevo en «¿Olvidaste tu contraseña?».";
const EXPIRED = "Este paso venció. Pide un enlace para crear tu contraseña en «¿Olvidaste tu contraseña?».";
const NOT_READY = "Tu cuenta todavía se está creando. Intenta de nuevo en unos segundos.";

/**
 * Primera contraseña del dueño desde la página de éxito del pago, para que entre a su
 * cuenta en el acto sin ir a buscar el correo de bienvenida.
 *
 * La credencial es la misma que la del resto del alta: el token de la solicitud (que solo
 * tiene quien abrió el enlace del correo) junto con la referencia del pago. Por eso:
 * - solo sirve para una cuenta recién creada que nunca entró: no puede cambiar la
 *   contraseña de alguien que ya usa su cuenta (p. ej. el dueño de otro local);
 * - vence a los 7 días del pago (`payments_history.payment_date`);
 * - es de un solo uso: al usarla se cambia el `verification_token` de la solicitud, así
 *   el mismo token y la misma referencia (que quedan en el historial del navegador o en un
 *   correo reenviado) no vuelven a servir. Se cambia antes de guardar la contraseña y con
 *   condición sobre el token viejo: dos envíos a la vez no pasan los dos. Si guardar la
 *   contraseña falla, se devuelve el token para reintentar.
 * El límite de intentos por referencia lo pone la ruta.
 */
export async function setOwnerFirstPassword(
	supabaseAdmin: SupabaseClient,
	params: { paymentReference: string; verificationToken: string; password: string; now?: Date },
): Promise<OwnerFirstPasswordResult> {
	const now = params.now ?? new Date();
	const password = params.password;
	if (password.length < MIN_OWNER_PASSWORD_LENGTH || password.length > MAX_OWNER_PASSWORD_LENGTH) {
		return { ok: false, error: `La contraseña debe tener entre ${MIN_OWNER_PASSWORD_LENGTH} y ${MAX_OWNER_PASSWORD_LENGTH} caracteres.`, status: 400 };
	}

	const { data: app } = await supabaseAdmin
		.from("onboarding_applications")
		.select("id,email,company_id,payment_status,verification_token")
		.eq("payment_reference", params.paymentReference)
		.maybeSingle();
	if (!app || !params.verificationToken || String(app.verification_token ?? "") !== params.verificationToken) {
		return { ok: false, error: USED_OR_INVALID, status: 404 };
	}
	if (String(app.payment_status ?? "") !== "paid" || !app.company_id) {
		return { ok: false, error: NOT_READY, status: 409 };
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
		return { ok: false, error: NOT_READY, status: 409 };
	}

	const { data: authUser, error: readError } = await supabaseAdmin.auth.admin.getUserById(authUserId);
	if (readError || !authUser?.user) {
		return { ok: false, error: "No pudimos preparar tu acceso. Usa el enlace del correo de bienvenida.", status: 500 };
	}
	if (authUser.user.last_sign_in_at) {
		return { ok: false, error: "Esta cuenta ya tiene contraseña. Entra con ella o pide un enlace nuevo.", status: 409 };
	}

	// Vence a los 7 días del pago. Sin la fila del pago cuenta la creación de la cuenta del
	// dueño, que se hace al cerrar el alta; sin ninguna de las dos, se da por vencido.
	const { data: payment } = await supabaseAdmin
		.from("payments_history")
		.select("payment_date")
		.eq("payment_reference", params.paymentReference)
		.eq("status", "paid")
		.order("payment_date", { ascending: false })
		.limit(1)
		.maybeSingle();
	const paidAtMs = Date.parse(String(payment?.payment_date ?? authUser.user.created_at ?? ""));
	if (!Number.isFinite(paidAtMs) || now.getTime() - paidAtMs > OWNER_FIRST_PASSWORD_TTL_MS) {
		return { ok: false, error: EXPIRED, status: 410 };
	}

	// Un solo uso: se gasta el token antes de tocar la contraseña.
	const rotated = randomUUID();
	const { data: claimed, error: claimError } = await supabaseAdmin
		.from("onboarding_applications")
		.update({ verification_token: rotated, updated_at: now.toISOString() })
		.eq("id", app.id)
		.eq("verification_token", params.verificationToken)
		.select("id")
		.maybeSingle();
	if (claimError) {
		return { ok: false, error: "No pudimos guardar la contraseña. Intenta de nuevo en un momento.", status: 500 };
	}
	if (!claimed) {
		return { ok: false, error: USED_OR_INVALID, status: 409 };
	}

	const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, { password });
	if (updateError) {
		// Se devuelve el token: el dueño puede reintentar con otra contraseña desde la misma página.
		const { error: restoreError } = await supabaseAdmin
			.from("onboarding_applications")
			.update({ verification_token: params.verificationToken })
			.eq("id", app.id)
			.eq("verification_token", rotated);
		if (restoreError) console.error("owner first password: no se pudo devolver el token", { applicationId: app.id, error: restoreError.message });
		return { ok: false, error: "No pudimos guardar la contraseña. Intenta con otra.", status: 400 };
	}
	return { ok: true, email };
}
