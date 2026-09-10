import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";

const EXPIRATION_DAYS = 7;

/** @service-role cron-secret */

export async function POST(req: NextRequest) {
	// Fail-closed: antes, sin `CRON_SECRET` en el entorno la condición se saltaba
	// entera y cualquiera podía disparar el borrado masivo de solicitudes.
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

	const cutoff = new Date(Date.now() - EXPIRATION_DAYS * 24 * 60 * 60 * 1000);

	const { error } = await supabaseAdmin
		.from("onboarding_applications")
		.delete()
		.lt("created_at", cutoff.toISOString())
		.eq("status", "pending_verification");

	if (error) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}

	return NextResponse.json({ success: true });
}
