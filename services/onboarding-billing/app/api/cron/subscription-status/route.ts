import { NextRequest, NextResponse } from "next/server";

import { readBearerSecret, secretsMatch } from "@/lib/infra/secret-compare";
import { supabaseAdmin } from "@/lib/infra/supabase-admin";
import { applyScheduledPlanChangesDue, suspendExpiredSubscriptions } from "@/lib/onboarding/billing-activation";
import { processDueBookingReminders } from "@/lib/onboarding/booking-notifications";

/** @service-role cron-secret */

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

	const result = await suspendExpiredSubscriptions({ supabaseAdmin });
	const scheduledChanges = await applyScheduledPlanChangesDue({ supabaseAdmin });

	if (result.error) {
		return NextResponse.json({ error: result.error }, { status: 500 });
	}

	if (scheduledChanges.error) {
		return NextResponse.json({ error: scheduledChanges.error }, { status: 500 });
	}

	const reminderResult = await processDueBookingReminders({ supabaseAdmin });
	if (reminderResult.errors > 0 && result.suspended === 0) {
		return NextResponse.json(
			{ error: "No se pudieron procesar algunos recordatorios programados", processed_bookings: reminderResult.processed, errors: reminderResult.errors },
			{ status: 500 }
		);
	}

	if (result.suspended === 0) {
		return NextResponse.json({
			ok: true,
			suspended: 0,
			applied_plan_changes: scheduledChanges.applied,
			failed_plan_changes: scheduledChanges.failed,
			processed_bookings: reminderResult.processed,
			message: reminderResult.processed > 0 ? "Recordatorios programados enviados" : "Nada que actualizar",
		});
	}

	return NextResponse.json({
		ok: true,
		suspended: result.suspended,
		applied_plan_changes: scheduledChanges.applied,
		failed_plan_changes: scheduledChanges.failed,
		processed_bookings: reminderResult.processed,
	});
}

export async function POST(req: NextRequest) {
	return GET(req);
}
