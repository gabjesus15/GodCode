import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { setOwnerFirstPassword } from "@/lib/onboarding/owner-first-password";
import { isRateLimited } from "@/lib/onboarding/rate-limit";

/** @service-role capability-token
 *
 * Primera contraseña del dueño desde la página de éxito: token de la solicitud y referencia
 * del pago, solo para una cuenta que nunca entró.
 */

function getClientIp(req: NextRequest): string {
	return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as { ref?: string; token?: string; password?: string };
		const ref = typeof body.ref === "string" ? body.ref.trim() : "";
		const token = typeof body.token === "string" ? body.token.trim() : "";
		const password = typeof body.password === "string" ? body.password : "";

		if (!ref || ref.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(ref) || !token || token.length > 100) {
			return NextResponse.json({ error: "Falta el enlace de tu alta." }, { status: 400 });
		}
		if (await isRateLimited(`onboarding_set_password:ip:${getClientIp(req)}`, 10, 10 * 60_000)) {
			return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
		}

		const result = await setOwnerFirstPassword(supabaseAdmin, { paymentReference: ref, verificationToken: token, password });
		if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
		return NextResponse.json({ ok: true, email: result.email });
	} catch (err) {
		console.error("onboarding set-password error:", err);
		return NextResponse.json({ error: "Error interno. Usa el enlace del correo de bienvenida." }, { status: 500 });
	}
}
