import { NextRequest, NextResponse } from "next/server";

import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { runDailySubscriptionJobs } from "@/lib/onboarding/daily-jobs";
import { proxyToOnboardingBilling } from "@/lib/onboarding/service-proxy";

/** @service-role cron-secret */

// Suspende vencidas, aplica cambios de plan y manda los recordatorios del día (con pausas
// entre correos por el límite de Resend).
export const maxDuration = 60;

export async function GET(req: NextRequest) {
	const proxied = await proxyToOnboardingBilling(req, "/api/cron/subscription-status");
	if (proxied) return proxied;

	const isDev = process.env.NODE_ENV === "development" && !process.env.VERCEL_ENV;
	const expectedSecret = process.env.CRON_SECRET?.trim();

	if (!isDev && !expectedSecret) {
		return NextResponse.json(
			{ error: "CRON_SECRET es obligatorio en entornos desplegados" },
			{ status: 503 },
		);
	}

	// Comparación en tiempo constante para no filtrar el secreto por temporización.
	if (expectedSecret && !secretsMatch(readBearerSecret(req.headers.get("authorization")), expectedSecret)) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const summary = await runDailySubscriptionJobs({ supabaseAdmin });
	return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}

export async function POST(req: NextRequest) {
	return GET(req);
}
