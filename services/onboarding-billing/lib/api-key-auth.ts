import { NextRequest, NextResponse } from "next/server";

import { secretsMatch } from "@/lib/infra/secret-compare";

const SERVICE_API_KEY = process.env.SERVICE_API_KEY ?? "";

export type ApiKeyResult =
	| { ok: true }
	| { ok: false; response: NextResponse };

export function validateApiKey(req: NextRequest): ApiKeyResult {
	if (!SERVICE_API_KEY) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "SERVICE_API_KEY not configured" },
				{ status: 503 }
			),
		};
	}

	// Comparación en tiempo constante: `!==` filtraba por temporización cuántos
	// bytes de la clave interna acertaba quien llamara al microservicio directo.
	if (!secretsMatch(req.headers.get("x-internal-api-key"), SERVICE_API_KEY)) {
		return {
			ok: false,
			response: NextResponse.json(
				{ error: "No autorizado" },
				{ status: 401 }
			),
		};
	}

	return { ok: true };
}
