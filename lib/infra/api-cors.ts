import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * CORS opcional para APIs públicas cuando el menú se sirve en otro origen.
 * Define `PUBLIC_API_CORS_ORIGINS` como lista separada por comas (ej. https://menu.tudominio.com).
 */
export function publicApiCorsHeaders(request: NextRequest): Headers {
	const headers = new Headers();
	const raw = process.env.PUBLIC_API_CORS_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? [];
	if (raw.length === 0) return headers;
	const origin = request.headers.get("origin");
	const allow = origin && raw.includes(origin) ? origin : raw[0];
	headers.set("Access-Control-Allow-Origin", allow);
	headers.set("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
	headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
	headers.set("Access-Control-Max-Age", "86400");
	return headers;
}

export function jsonWithPublicCors(
	request: NextRequest,
	body: unknown,
	init?: { status?: number },
): NextResponse {
	const res = NextResponse.json(body, { status: init?.status ?? 200 });
	const cors = publicApiCorsHeaders(request);
	cors.forEach((value, key) => res.headers.set(key, value));
	return res;
}
