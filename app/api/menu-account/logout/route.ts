import type { NextRequest } from "next/server";

import { jsonOk } from "@/lib/api/response";
import { enforceRateLimit } from "@/lib/infra/api-guard";
import { createMenuClientResponseClient } from "@/lib/menu-account/cookies";
import {
	createCookieCarrier,
	toMenuAccountErrorResponse,
	withCarriedCookies,
} from "@/lib/menu-account/route-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cierra SOLO la sesión del cliente del menú. Deliberadamente separado de
 * `/api/auth/signout`, que cierra los scopes de panel: un empleado que navegue el
 * menú como cliente no debe perder una sesión al salir de la otra.
 */
export async function POST(req: NextRequest) {
	const limited = await enforceRateLimit(req, "menu_account_logout", 30, 60_000);
	if (limited) return limited;

	try {
		const carrier = createCookieCarrier();
		const supabase = createMenuClientResponseClient(req, carrier);
		try {
			await supabase.auth.signOut();
		} catch {
			// Sesión ya expirada o Supabase caído: el logout no debe fallar por eso.
		}
		return withCarriedCookies(carrier, jsonOk({ ok: true }));
	} catch (error) {
		return toMenuAccountErrorResponse(error, "menu_account_logout");
	}
}
