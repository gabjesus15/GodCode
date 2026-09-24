import { NextRequest, NextResponse } from "next/server";

import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { runDailySubscriptionJobs } from "@/lib/onboarding/daily-jobs";

/** @service-role cron-secret */

// Suspende vencidas, aplica cambios de plan y manda los recordatorios del día (con pausas
// entre correos por el límite de Resend).
export const maxDuration = 60;

export async function GET(req: NextRequest) {
	// Fail-closed y en tiempo constante: antes, sin CRON_SECRET en el entorno la
	// condicion se saltaba entera y el endpoint quedaba abierto.
	const expectedSecret = process.env.CRON_SECRET?.trim();
	if (!expectedSecret) {
		return NextResponse.json(
			{ error: "CRON_SECRET es obligatorio para este endpoint" },
			{ status: 503 },
		);
	}

	if (!secretsMatch(readBearerSecret(req.headers.get("authorization")), expectedSecret)) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const summary = await runDailySubscriptionJobs({ supabaseAdmin });
	return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
	return GET(req);
}
