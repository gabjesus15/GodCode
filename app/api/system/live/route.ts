import { NextResponse } from "next/server";

/**
 * Liveness para el HEALTHCHECK del contenedor: solo dice que el proceso responde.
 * No toca la base de datos ni el microservicio (eso es /api/system/health), para que
 * una caída de Postgres no marque el contenedor como muerto.
 */
export const dynamic = "force-dynamic";

export function GET() {
	return NextResponse.json({ status: "alive" }, { headers: { "Cache-Control": "no-store" } });
}
