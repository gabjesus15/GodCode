import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import {
	getAuthCookieName,
	PANEL_AUTH_SCOPES,
	type SupabaseAuthScope,
} from "@/utils/supabase/auth-scope";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const getCookieName = getAuthCookieName;

/** Invalida sesiones Supabase y escribe las cookies limpias en la respuesta HTTP. */
export async function signOutScopesOnResponse(
	request: NextRequest,
	response: NextResponse,
	// Solo los paneles: la sesión del cliente final del menú se cierra por su propia
	// ruta (`/api/menu-account/logout`) para no arrastrarla en el logout del panel.
	scopes: SupabaseAuthScope[] = PANEL_AUTH_SCOPES,
): Promise<void> {
	if (!supabaseUrl || !supabaseAnonKey) return;

	for (const scope of scopes) {
		const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
			cookieOptions: {
				name: getCookieName(scope),
			},
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						response.cookies.set(name, value, options);
					});
				},
			},
		});

		try {
			await supabase.auth.signOut();
		} catch {
			// No bloquear logout por fallos transitorios de red o sesión ya expirada.
		}
	}
}
