import { NextRequest, NextResponse } from "next/server";

import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";
import { logger } from "@/lib/infra/logger";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { expireUnverifiedApplications } from "@/lib/onboarding/expire-unverified";
import { forwardOnboardingBilling } from "@/lib/onboarding/onboarding-bff-proxy";

/** @service-role cron-secret, proxy-only
 *
 * GET lo dispara el cron de Vercel (vercel.json) con `Authorization: Bearer CRON_SECRET`
 * y corre aquí mismo: borrar por fecha no necesita el microservicio, y así no depende de
 * que el proxy esté activo. POST sigue reenviando al microservicio como antes.
 */

export async function GET(req: NextRequest) {
	// Fail-closed: sin CRON_SECRET nadie puede disparar el borrado.
	const expectedSecret = process.env.CRON_SECRET?.trim();
	if (!expectedSecret) {
		return NextResponse.json({ error: "CRON_SECRET es obligatorio para este endpoint" }, { status: 503 });
	}
	if (!secretsMatch(readBearerSecret(req.headers.get("authorization")), expectedSecret)) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const result = await expireUnverifiedApplications(supabaseAdmin);
	if (!result.ok) {
		logger.error("expire_unverified_failed", { message: result.error });
		return NextResponse.json({ error: "No se pudieron expirar las solicitudes." }, { status: 500 });
	}
	return NextResponse.json({ success: true });
}

export async function POST(req: NextRequest) {
	return forwardOnboardingBilling(req, "/api/onboarding/expire-unverified");
}
