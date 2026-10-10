import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { isRateLimited } from "@/lib/onboarding/rate-limit";
import { startStoreFromApplication } from "@/lib/onboarding/start-store";

/** @service-role capability-token
 *
 * «Crear mi tienda»: el verification_token del correo ya confirmado es la credencial.
 * Crea la cuenta del dueño con su contraseña y la tienda en vista previa.
 */

function getClientIp(req: NextRequest): string {
	return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
	try {
		const body = (await req.json().catch(() => ({}))) as {
			token?: string;
			business_name?: string;
			slug?: string;
			sector?: string;
			password?: string;
		};
		const token = typeof body.token === "string" ? body.token.trim() : "";
		if (!token || token.length > 100) {
			return NextResponse.json({ error: "Falta el enlace de tu registro. Vuelve a abrirlo desde el correo.", code: "missing_link" }, { status: 400 });
		}
		if (await isRateLimited(`onboarding_start_store:ip:${getClientIp(req)}`, 10, 10 * 60_000)) {
			return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos.", code: "rate_limited" }, { status: 429 });
		}

		const result = await startStoreFromApplication(supabaseAdmin, {
			token,
			businessName: typeof body.business_name === "string" ? body.business_name : null,
			slug: typeof body.slug === "string" ? body.slug : "",
			sector: typeof body.sector === "string" ? body.sector : null,
			password: typeof body.password === "string" ? body.password : "",
		});
		if (!result.ok) return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
		return NextResponse.json({ ok: true, email: result.email, slug: result.slug });
	} catch (err) {
		console.error("onboarding start-store error:", err);
		return NextResponse.json({ error: "Error interno. Intenta de nuevo en un momento.", code: "error" }, { status: 500 });
	}
}
