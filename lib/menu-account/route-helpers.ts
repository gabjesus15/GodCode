import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/response";
import { normalizeDocument } from "@/lib/geo/document-normalize";
import { logger } from "@/lib/infra/logger";

import type { MenuAccountCompany } from "./company-resolve";
import { MenuAccountError } from "./errors";
import { MENU_ACCOUNT_ENABLED } from "./feature";

/**
 * 404 mientras la cuenta de cliente esté apagada. Ocultar la página no basta: sin
 * esto, cualquiera podría registrar cuentas llamando a la API directamente.
 */
export function menuAccountDisabledResponse(): NextResponse | null {
	if (MENU_ACCOUNT_ENABLED) return null;
	return jsonError(404, "No encontrado.", { code: "not_found" });
}

/**
 * Clave de rate limit por documento, calculada sobre el documento normalizado. Con el
 * texto tal cual, `12.345.678-5`, `12345678-5` y `123456785` contarían como tres
 * claves distintas y el límite se esquivaría cambiando el formato. Se hashea para no
 * dejar el documento en el store.
 */
export function documentRateKey(
	company: Pick<MenuAccountCompany, "id" | "countryCode">,
	document: string,
): string {
	const result = normalizeDocument(document, company.countryCode);
	const canonical = result.ok
		? result.normalized
		: document.replace(/[^0-9a-zA-Z]/g, "").toUpperCase();
	return createHash("sha256").update(`${company.id}:${canonical}`).digest("hex").slice(0, 16);
}

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
