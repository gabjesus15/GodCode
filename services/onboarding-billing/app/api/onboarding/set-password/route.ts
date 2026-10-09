import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { setOwnerFirstPassword } from "@/lib/onboarding/owner-first-password";
import { MAX_OWNER_PASSWORD_LENGTH, MIN_OWNER_PASSWORD_LENGTH } from "@/lib/onboarding/owner-password-rules";
import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { setPasswordErrorCodeForStatus, type SetPasswordErrorCode } from "@/lib/plans/checkout-copy";

/** @service-role capability-token
 *
 * Primera contraseña del dueño desde la página de éxito: token de la solicitud y referencia
 * del pago, solo para una cuenta que nunca entró, hasta 7 días después del pago y una sola
 * vez (ver `setOwnerFirstPassword`).
 *
 * Límites: por IP (como el resto del alta) y por referencia del pago. La referencia de
 * PayPal aparece en recibos y en la URL de éxito; con ella fija, el límite por referencia
 * corta a quien pruebe tokens desde muchas IP.
 *
 * Los errores llevan un `code` estable que la página traduce (`lib/plans/checkout-copy.ts`);
 * el texto en español queda para el log y para clientes viejos.
 */

/** Intentos por referencia: alcanza para equivocarse varias veces, no para probar tokens. */
const REF_ATTEMPTS = 6;
const REF_WINDOW_MS = 60 * 60_000;

function getClientIp(req: NextRequest): string {
	return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

function fail(code: SetPasswordErrorCode, error: string, status: number) {
	return NextResponse.json({ code, error }, { status });
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { ref?: string; token?: string; password?: string };
		const ref = typeof body.ref === "string" ? body.ref.trim() : "";
		const token = typeof body.token === "string" ? body.token.trim() : "";
		const password = typeof body.password === "string" ? body.password : "";

		if (!ref || ref.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(ref) || !token || token.length > 100) {
			return fail("missing_link", "Falta el enlace de tu alta.", 400);
		}
		if (await isRateLimited(`onboarding_set_password:ip:${getClientIp(req)}`, 10, 10 * 60_000)) {
			return fail("rate_limited", "Demasiados intentos. Espera unos minutos.", 429);
		}
		if (await isRateLimited(`onboarding_set_password:ref:${ref}`, REF_ATTEMPTS, REF_WINDOW_MS)) {
			return fail("rate_limited", "Demasiados intentos con este pago. Crea tu contraseña con el enlace del correo de bienvenida.", 429);
		}
		// El largo se revisa aquí (además de en el helper) para que un 400 del helper sea
		// siempre «Supabase no aceptó esta contraseña» y no se confunda con este caso.
		if (password.length < MIN_OWNER_PASSWORD_LENGTH || password.length > MAX_OWNER_PASSWORD_LENGTH) {
			return fail("invalid_password", `La contraseña debe tener entre ${MIN_OWNER_PASSWORD_LENGTH} y ${MAX_OWNER_PASSWORD_LENGTH} caracteres.`, 400);
		}

		const result = await setOwnerFirstPassword(supabaseAdmin, { paymentReference: ref, verificationToken: token, password });
		if (!result.ok) {
			// El helper responde con el status: 404 (el token no corresponde o ya se gastó), 409 (ya
			// se usó: otro envío ganó o la cuenta ya entró), 410 (venció), 400 (la contraseña no se
			// aceptó) y 500. Su otro 409, «la cuenta todavía se está creando», no llega en la
			// práctica: la página solo muestra el formulario cuando finalize ya confirmó al dueño.
			return fail(setPasswordErrorCodeForStatus(result.status), result.error, result.status);
		}
		return NextResponse.json({ ok: true, email: result.email });
	} catch (err) {
		console.error("onboarding set-password error:", err);
		return fail("server_error", "Error interno. Usa el enlace del correo de bienvenida.", 500);
	}
}
