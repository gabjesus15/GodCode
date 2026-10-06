import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/utils/supabase/server";

/**
 * Canjea el enlace de "crear / cambiar contraseña" (bienvenida o recuperación) y deja la
 * sesión en cookies para elegir la contraseña en `/login/nueva-clave`. El token lo genera
 * `createPasswordSetupLink` y sirve una sola vez.
 *
 * El GET (lo que abre el correo) ya no canjea nada: lleva a `/login/activar`, que pide un
 * clic. Los antivirus de correo (Outlook, Gmail…) abren los enlaces antes que la persona y
 * gastaban el token: el dueño veía «el enlace venció o ya se usó» sin haberlo tocado.
 * El canje es el POST de ese botón.
 */

function readToken(value: FormDataEntryValue | string | null): string {
	return typeof value === "string" ? value.trim() : "";
}

function isValidToken(tokenHash: string, type: string | null): boolean {
	return Boolean(tokenHash) && type === "recovery" && tokenHash.length <= 200;
}

export async function GET(req: NextRequest) {
	const tokenHash = readToken(req.nextUrl.searchParams.get("token_hash"));
	const type = req.nextUrl.searchParams.get("type");
	if (!isValidToken(tokenHash, type)) {
		const loginUrl = new URL("/login", req.url);
		loginUrl.searchParams.set("error", "enlace");
		return NextResponse.redirect(loginUrl);
	}
	const activate = new URL("/login/activar", req.url);
	activate.searchParams.set("token_hash", tokenHash);
	activate.searchParams.set("type", "recovery");
	return NextResponse.redirect(activate);
}

export async function POST(req: NextRequest) {
	// Solo el botón de nuestra propia página puede canjear el token.
	const origin = req.headers.get("origin");
	const host = req.headers.get("host");
	let sameOrigin = false;
	try {
		sameOrigin = Boolean(origin && host && new URL(origin).host === host);
	} catch {
		sameOrigin = false;
	}
	if (!sameOrigin) {
		return NextResponse.redirect(new URL("/login?error=enlace", req.url), 303);
	}

	const form = await req.formData().catch(() => null);
	const tokenHash = readToken(form?.get("token_hash") ?? null);
	const type = readToken(form?.get("type") ?? null);
	if (!isValidToken(tokenHash, type)) {
		return NextResponse.redirect(new URL("/login?error=enlace", req.url), 303);
	}

	const supabase = await createSupabaseServerClient("super-admin");
	// Si en este navegador había otra cuenta abierta, el enlace manda: se cierra solo aquí.
	await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

	const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
	if (error) {
		// Vencido o ya usado: directo a pedir otro, sin pasar por el login.
		return NextResponse.redirect(new URL("/login/recuperar?vencido=1", req.url), 303);
	}

	return NextResponse.redirect(new URL("/login/nueva-clave", req.url), 303);
}
