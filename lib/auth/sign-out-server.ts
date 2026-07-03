import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import type { SupabaseAuthScope } from "@/utils/supabase/auth-scope";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function getCookieName(scope: SupabaseAuthScope): string {
	return scope === "super-admin" ? "sb-super-admin-auth-token" : "sb-tenant-auth-token";
}

/** Invalida sesiones Supabase y escribe las cookies limpias en la respuesta HTTP. */
export async function signOutScopesOnResponse(
	request: NextRequest,
	response: NextResponse,
	scopes: SupabaseAuthScope[] = ["super-admin", "tenant"],
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
