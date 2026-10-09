import { NextRequest, NextResponse } from "next/server";

import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { reconcileOnboarding } from "@/lib/onboarding/reconcile";

/** @service-role cron-secret */

// Barrido de altas a medias; ver la ruta de la app (`/api/system/cron/onboarding-reconcile`).
export const maxDuration = 60;

export async function GET(req: NextRequest) {
	const expectedSecret = process.env.CRON_SECRET?.trim();
	if (!expectedSecret) {
		return NextResponse.json({ error: "CRON_SECRET es obligatorio para este endpoint" }, { status: 503 });
	}
	if (!secretsMatch(readBearerSecret(req.headers.get("authorization")), expectedSecret)) {
		return NextResponse.json({ error: "No autorizado" }, { status: 401 });
	}

	const summary = await reconcileOnboarding({ supabaseAdmin, deadlineMs: Date.now() + (maxDuration - 15) * 1000 });
	return NextResponse.json(summary);
}

export async function POST(req: NextRequest) {
	return GET(req);
}
