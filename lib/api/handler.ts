import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { z } from "zod";

import { jsonError, jsonOk, parseJsonBody } from "./response";

/** Error controlado para APIs (status + code opcional). */
export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code?: string,
	) {
		super(message);
		this.name = "ApiError";
	}
}

type ApiHandlerFn = (req: NextRequest) => Promise<NextResponse>;

type WithApiHandlerOptions = {
	/** Solo permite estos métodos (405 si no coincide). */
	allowedMethods?: readonly string[];
	/** Si se define, valida JSON body con Zod. */
	bodySchema?: z.ZodTypeAny;
};

/**
 * Envuelve un handler de route con manejo uniforme de errores y validación opcional de body.
 */
export function withApiHandler(
	fn: (req: NextRequest, ctx: { json?: unknown }) => Promise<NextResponse>,
	opts: WithApiHandlerOptions = {},
): ApiHandlerFn {
	const methods = opts.allowedMethods;

	return async (req: NextRequest) => {
		try {
			if (methods?.length && !methods.includes(req.method)) {
				return jsonError(405, "Método no permitido", { code: "method_not_allowed" });
			}

			let parsedBody: unknown;
			if (opts.bodySchema && req.method !== "GET" && req.method !== "HEAD") {
				const parsed = await parseJsonBody(req, opts.bodySchema);
				if (!parsed.ok) return parsed.response;
				parsedBody = parsed.data;
			}

			return await fn(req, { json: parsedBody });
		} catch (e) {
			if (e instanceof ApiError) {
				return jsonError(e.status, e.message, { code: e.code });
			}
			console.error("[api]", e);
			return jsonError(500, "Error interno", { code: "internal_error" });
		}
	};
}

export { jsonOk, jsonError, parseJsonBody };
