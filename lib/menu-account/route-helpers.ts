import "server-only";

import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/response";
import { logger } from "@/lib/infra/logger";

import { MenuAccountError } from "./errors";

/**
 * Respuesta "portadora": el cliente Supabase escribe aquí las cookies de sesión
 * mientras corre la operación, y después se trasplantan a la respuesta real.
 *
 * Hace falta porque el cuerpo JSON no se conoce hasta que la operación termina,
 * pero el cliente de `@supabase/ssr` necesita una `NextResponse` desde el principio.
 */
export function createCookieCarrier(): NextResponse {
	return new NextResponse(null);
}

/** Copia las cookies acumuladas en la portadora a la respuesta definitiva. */
export function withCarriedCookies(carrier: NextResponse, response: NextResponse): NextResponse {
	for (const cookie of carrier.cookies.getAll()) {
		response.cookies.set(cookie);
	}
	return response;
}

/**
 * Traduce cualquier error a una respuesta JSON. Los `MenuAccountError` llevan su
 * propio status y código; el resto se convierte en 500 genérico y se loguea, para
 * no filtrar detalles internos al navegador.
 */
export function toMenuAccountErrorResponse(error: unknown, context: string): NextResponse {
	if (error instanceof MenuAccountError) {
		return jsonError(error.status, error.message, { code: error.code });
	}

	logger.error("menu_account_unhandled_error", {
		context,
		message: error instanceof Error ? error.message : String(error),
	});
	return jsonError(500, "No se pudo completar la operación. Intenta de nuevo.", {
		code: "internal",
	});
}
