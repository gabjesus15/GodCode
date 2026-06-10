import { NextRequest, NextResponse } from "next/server";
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
      console.error("[API_ERROR]", req.nextUrl.pathname, error);

      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.statusCode }
        );
      }

      // Si es un error desconocido o no manejado
      const message = error instanceof Error ? error.message : "Internal Server Error";
      return NextResponse.json(
        { error: message },
        { status: 500 }
      );
    }
  };
}
