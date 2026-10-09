import { NextRequest, NextResponse } from "next/server";

import { buildAppUrl, getAppHostname } from "@/lib/tenant/app-url";
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
 *
 * Detrás del proxy (Coolify) `req.url` llega como `http://0.0.0.0:3000/...` y `host` es el
 * interno: las redirecciones se arman con `buildAppUrl` (dominio público) y el `Origin` se
 * compara con el hostname público (`getAppHostname`, `x-forwarded-host`), no con `host`.
 */

function readToken(value: FormDataEntryValue | string | null): string {
	return typeof value === "string" ? value.trim() : "";
}

function isValidToken(tokenHash: string, type: string | null): boolean {
	return Boolean(tokenHash) && type === "recovery" && tokenHash.length <= 200;
}

function redirectTo(pathname: string, search = "", status: 302 | 303 = 303): NextResponse {
	return NextResponse.redirect(buildAppUrl(pathname, search), status);
}

/** Hostnames con los que la petición puede identificarse: el público, el reenviado y el propio. */
function requestHostnames(req: NextRequest): Set<string> {
	const names = new Set<string>();
	const add = (value: string | null) => {
		for (const part of String(value ?? "").split(",")) {
			const host = part.trim().toLowerCase().split(":")[0];
			if (host) names.add(host);
		}
	};
	add(req.headers.get("x-forwarded-host"));
	add(req.headers.get("host"));
	const app = getAppHostname();
	if (app) names.add(app);
	return names;
}

/** Solo el botón de nuestra propia página puede canjear el token. */
function isSameOrigin(req: NextRequest): boolean {
	const origin = req.headers.get("origin");
	if (!origin) return false;
	try {
		return requestHostnames(req).has(new URL(origin).hostname.toLowerCase());
	} catch {
		return false;
	}
}

export async function GET(req: NextRequest) {
	const tokenHash = readToken(req.nextUrl.searchParams.get("token_hash"));
	const type = req.nextUrl.searchParams.get("type");
	if (!isValidToken(tokenHash, type)) {
		return redirectTo("/login", "error=enlace", 302);
	}
	const params = new URLSearchParams({ token_hash: tokenHash, type: "recovery" });
	return redirectTo("/login/activar", params.toString(), 302);
}

export async function POST(req: NextRequest) {
	if (!isSameOrigin(req)) {
		return redirectTo("/login", "error=enlace");
	}

	const form = await req.formData().catch(() => null);
	const tokenHash = readToken(form?.get("token_hash") ?? null);
	const type = readToken(form?.get("type") ?? null);
	if (!isValidToken(tokenHash, type)) {
		return redirectTo("/login", "error=enlace");
	}

	const supabase = await createSupabaseServerClient("super-admin");
	// Si en este navegador había otra cuenta abierta, el enlace manda: se cierra solo aquí.
	await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

	const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
	if (error) {
		// Vencido o ya usado: directo a pedir otro, sin pasar por el login.
		return redirectTo("/login/recuperar", "vencido=1");
	}

	return redirectTo("/login/nueva-clave");
}
