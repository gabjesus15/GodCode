import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/infra/logger";

import { ApiError } from "./errors";

type HandlerContext = unknown;
type RouteHandler = (req: NextRequest, ctx: HandlerContext) => Promise<NextResponse | void> | NextResponse | void;

/**
 * Envoltorio (Wrapper) centralizado para las rutas de API.
 * 
 * Atrapa cualquier excepción (incluyendo ApiError) y devuelve un formato JSON consistente.
 * Elimina la necesidad de usar bloques try/catch masivos en cada route.ts.
 */
export function withApiHandler(handler: RouteHandler) {
  return async (req: NextRequest, ctx: HandlerContext) => {
    try {
      const response = await handler(req, ctx);
      
      // Si el handler decide devolver algo específico, lo respetamos
      if (response instanceof NextResponse) {
        return response;
      }
      
      // Fallback seguro si el handler no devuelve un NextResponse
      return NextResponse.json({ success: true }, { status: 200 });
      
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      // Error no previsto: el detalle (mensajes de Postgres, rutas, nombres de tablas) va
      // solo al log; al cliente, un mensaje genérico. Los ApiError sí son para mostrar.
      logger.error("api_unhandled_error", {
        endpoint: req.nextUrl.pathname,
        method: req.method,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      return NextResponse.json(
        { error: "Error interno del servidor" },
        { status: 500 }
      );
    }
  };
}
