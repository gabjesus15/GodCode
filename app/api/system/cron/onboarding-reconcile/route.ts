import { NextRequest, NextResponse } from "next/server";

import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { reconcileOnboarding } from "@/lib/onboarding/reconcile";
import { proxyToOnboardingBilling } from "@/lib/onboarding/service-proxy";

/** @service-role cron-secret */

// Barrido de altas a medias (PayPal sin cerrar, dueño sin acceso). Ya corre dentro del cron
// diario; esta ruta sirve para programarlo más seguido (cada hora) desde un cron externo.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
	const proxied = await proxyToOnboardingBilling(req, "/api/cron/onboarding-reconcile");
	if (proxied) return proxied;

	const isDev = process.env.NODE_ENV === "development" && !process.env.VERCEL_ENV;
	const expectedSecret = process.env.CRON_SECRET?.trim();
	if (!isDev && !expectedSecret) {
		return NextResponse.json({ error: "CRON_SECRET es obligatorio en entornos desplegados" }, { status: 503 });
	}
	if (expectedSecret && !secretsMatch(readBearerSecret(req.headers.get("authorization")), expectedSecret)) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const summary = await reconcileOnboarding({ supabaseAdmin, deadlineMs: Date.now() + (maxDuration - 15) * 1000 });
	return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
	return GET(req);
}
