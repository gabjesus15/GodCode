import { NextRequest, NextResponse } from "next/server";

import { createPasswordSetupLink } from "@/lib/auth/password-setup-link";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { checkRateLimit } from "@/lib/infra/rate-limiter";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { sendEmail } from "@/lib/email/send";
import { normalizeEmail } from "@/lib/onboarding/trial-eligibility";

/** @service-role public
 *
 * Recuperación de contraseña de los paneles (dueños, equipo y super admin). Responde
 * siempre lo mismo exista o no la cuenta, para no revelar qué correos están registrados.
 */

const GENERIC_RESPONSE = {
	ok: true,
	message: "Si ese correo tiene una cuenta, te enviamos un enlace para elegir una nueva contraseña.",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
	const limited = await enforceRateLimit(req, "auth_password_recovery", 5, 10 * 60_000);
	if (limited) return limited;

	const body = (await req.json().catch(() => ({}))) as { email?: string };
	const email = normalizeEmail(body.email);
	if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) {
		return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
	}

	// Como mucho tres correos por hora a la misma dirección.
	if (!(await checkRateLimit(`auth_password_recovery_email:${email}`, 3, 60 * 60_000))) {
		return NextResponse.json(GENERIC_RESPONSE);
	}

	const [{ data: panelUser }, { data: adminUser }] = await Promise.all([
		supabaseAdmin
			.from("users")
			.select("full_name")
			.eq("email", email)
			.eq("is_active", true)
			.not("auth_user_id", "is", null)
			.limit(1)
			.maybeSingle(),
		supabaseAdmin.from("admin_users").select("email").eq("email", email).maybeSingle(),
	]);

	if (panelUser || adminUser) {
		const resetUrl = await createPasswordSetupLink(supabaseAdmin, email);
		if (resetUrl) {
			await sendEmail({
				kind: "password_reset",
				to: email,
				data: { name: panelUser?.full_name ?? undefined, resetUrl },
			});
		}
	}

	return NextResponse.json(GENERIC_RESPONSE);
}
