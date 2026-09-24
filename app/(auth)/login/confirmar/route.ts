import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

/**
 * Canjea el enlace de "crear / cambiar contraseña" (bienvenida o recuperación) y deja la
 * sesión en cookies para elegir la contraseña en `/login/nueva-clave`. El token lo genera
 * `createPasswordSetupLink` y sirve una sola vez.
 */
export async function GET(req: NextRequest) {
	const tokenHash = req.nextUrl.searchParams.get("token_hash")?.trim() ?? "";
	const type = req.nextUrl.searchParams.get("type");
	const loginUrl = new URL("/login", req.url);

	if (!tokenHash || type !== "recovery" || tokenHash.length > 200) {
		loginUrl.searchParams.set("error", "enlace");
		return NextResponse.redirect(loginUrl);
	}

	const supabase = await createSupabaseServerClient("super-admin");
	// Si en este navegador había otra cuenta abierta, el enlace manda: se cierra solo aquí.
	await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

	const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
	if (error) {
		loginUrl.searchParams.set("error", "enlace-vencido");
		return NextResponse.redirect(loginUrl);
	}

	return NextResponse.redirect(new URL("/login/nueva-clave", req.url));
}
