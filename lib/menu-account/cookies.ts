import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { getAuthCookieName } from "@/utils/supabase/auth-scope";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/**
 * Cliente Supabase del scope `menu-client` ligado a una `NextResponse`.
 *
 * Es la pieza que hace que login, vinculación y recuperación dejen la cookie puesta
 * sin que el navegador tenga que instanciar nunca un cliente Supabase de este scope.
 */
export function createMenuClientResponseClient(request: NextRequest, response: NextResponse) {
	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error("Missing Supabase environment variables.");
	}

	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookieOptions: {
			name: getAuthCookieName("menu-client"),
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
}
