import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { startTimer } from "@/lib/infra/logger";
import { validateApiKey } from "../../../lib/api-key-auth";

const startedAt = new Date().toISOString();

/**
 * @service-role internal-api-key
 *
 * El detalle (latencia de Postgres, qué variables de entorno faltan) solo se
 * entrega a quien presente la clave interna: es un mapa de la infraestructura.
 * Sin clave se responde vivo, que es lo único que necesita un balanceador, y no
 * se toca la base de datos.
 */
export async function GET(req: NextRequest) {
	const auth = validateApiKey(req);

	if (!auth.ok) {
		return NextResponse.json(
			{ service: "onboarding-billing", status: "alive", timestamp: new Date().toISOString() },
			{ status: 200 },
		);
	}

	const checks: Record<string, string> = {};
	let healthy = true;

	try {
		const elapsed = startTimer();
		const { error } = await supabaseAdmin
			.from("companies")
			.select("id")
			.limit(1)
			.maybeSingle();
		checks.database = error ? "unhealthy" : "ok";
		checks.database_latency_ms = String(elapsed());
		if (error) healthy = false;
	} catch {
		checks.database = "unhealthy";
		healthy = false;
	}

	checks.env_supabase_url = process.env.NEXT_PUBLIC_SUPABASE_URL ? "ok" : "missing";
	checks.env_service_role = process.env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "missing";
	checks.env_service_api_key = process.env.SERVICE_API_KEY ? "ok" : "missing";

	if (
		!process.env.NEXT_PUBLIC_SUPABASE_URL ||
		!process.env.SUPABASE_SERVICE_ROLE_KEY ||
		!process.env.SERVICE_API_KEY
	) {
		healthy = false;
	}

	return NextResponse.json(
		{
			service: "onboarding-billing",
			status: healthy ? "healthy" : "degraded",
			started_at: startedAt,
			timestamp: new Date().toISOString(),
			checks,
		},
		{ status: healthy ? 200 : 503 }
	);
}
